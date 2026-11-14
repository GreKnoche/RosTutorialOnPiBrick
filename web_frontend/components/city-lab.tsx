"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { LocateFixed, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseCity, type CityMap, type LapState, type Rect } from "@/lib/city-map";
import { draw } from "@/lib/city-paint";
import type { MissionCheckpoint, MissionObstacle, ObstacleTrigger } from "@/lib/nav2-lessons";
import {
  emptyMemory,
  parseProbe,
  probeStatus,
  type CityProbe,
  type ProbeMemory,
} from "@/lib/city-probe";
import {
  CITY_VIEW_H,
  CITY_VIEW_W,
  ZOOM_DEFAULT,
  cityPpm,
  clampZoom,
  lookForTopRight,
} from "@/lib/city-view";
import { formatDe } from "@/lib/format";
import { ghostAt, ghostCrossTime, ghostPoses, ghostRace, ghostTrace, type GhostPose } from "@/lib/ghost-lap";
import { MELONS, freshMelons, nearestMelon, takeMelons } from "@/lib/melons";
import { holdRunTerminal, noteRunPhase, readRunTerminal, serverRunTerminal, setRunTerminal, subscribeRunTerminal } from "@/lib/run-terminal";
import { ROBOT_API, openTwin, type CostmapGrid, type TwinLink, type TwinPhase, type TwinState } from "@/lib/twin-socket";

type MapPin = { left: number; top: number; x: number; y: number; theta: number };

function clockLabel(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function MapClock({ runKey, running }: { runKey: number; running: boolean }) {
  const origin = useRef(0);
  const [stamp, setStamp] = useState(0);
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    if (runKey === 0) return;
    origin.current = performance.now();
    setStamp(runKey);
    setMs(0);
  }, [runKey]);

  useEffect(() => {
    if (!running || stamp !== runKey || runKey === 0) return;
    const id = window.setInterval(() => {
      setMs(performance.now() - origin.current);
    }, 200);
    return () => window.clearInterval(id);
  }, [running, runKey, stamp]);

  if (ms === null || stamp !== runKey) return null;
  const label = clockLabel(ms);
  return (
    <p
      role="timer"
      aria-label={`Zeit ${label}`}
      className="pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 font-mono text-xs tabular-nums tracking-wide text-[#fff7ed]/75"
      style={{ textShadow: "0 1px 2px rgba(17, 19, 24, 0.7)" }}
    >
      {label}
    </p>
  );
}

type Course = {
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
  later?: MissionObstacle[];
  trigger?: ObstacleTrigger;
};

type GhostTake = {
  on: boolean;
  settled: boolean;
  t0: number;
  last: number;
  points: GhostPose[];
};

async function commitGhost(points: GhostPose[]): Promise<{ ok: boolean; note: string }> {
  const poses = ghostTrace(points);
  if (poses.length < 2) return { ok: false, note: "Zu wenig Bewegung. Aufnahme verworfen." };
  try {
    const response = await fetch("/api/ghost-lap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ poses }),
    });
    const body = (await response.json()) as { ok?: boolean; message?: string; count?: number; seconds?: number };
    if (!response.ok || body.ok !== true) return { ok: false, note: body.message ?? "Geist nicht gespeichert." };
    const seconds = typeof body.seconds === "number" ? body.seconds.toFixed(1) : "?";
    return { ok: true, note: `Geist gespeichert, ${body.count ?? poses.length} Punkte, ${seconds} s.` };
  } catch {
    return { ok: false, note: "Geist nicht gespeichert." };
  }
}

function MiniTwin() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden className="block">
      <rect x="0.6" y="1.6" width="10.2" height="6.8" rx="1.2" fill="#e6b325" stroke="#fff7ed" strokeWidth="0.6" />
      <rect x="2.4" y="0.35" width="2.2" height="1.5" rx="0.3" fill="#111318" />
      <rect x="2.4" y="8.15" width="2.2" height="1.5" rx="0.3" fill="#111318" />
      <path d="M11.2 5 L8.6 2.5 L8.6 7.5 Z" fill="#fff7ed" />
    </svg>
  );
}

function TwinOrbit() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-label="Knoten startet">
      <span className="relative size-8">
        <span className="absolute inset-2 rounded-full border border-neutral-500" />
        <span className="absolute inset-0 animate-spin [animation-duration:1.4s] motion-reduce:animate-none">
          <span className="absolute top-2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <MiniTwin />
          </span>
        </span>
      </span>
    </span>
  );
}

function FlagBox({
  on,
  disabled = false,
  title,
  onToggle,
  children,
}: {
  on: boolean;
  disabled?: boolean;
  title?: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      autoComplete="off"
      title={title}
      onClick={onToggle}
      className={`rounded-md border px-2.5 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        on
          ? "border-[#7aa3c4] bg-active-lesson text-foreground"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function clipNumber(value: number) {
  const trimmed = value.toFixed(2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed.includes(".") ? trimmed : `${trimmed}.0`;
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function pointClip(x: number, y: number, theta: number) {
  return `(${clipNumber(x)}, ${clipNumber(y)}, ${clipNumber(wrapAngle(theta))})`;
}

function copyPoint(text: string) {
  const clipboard = navigator.clipboard;
  if (clipboard?.writeText) {
    void clipboard.writeText(text).catch(() => copyPointFallback(text));
    return;
  }
  copyPointFallback(text);
}

function copyPointFallback(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function costmapKey(grid: CostmapGrid | null) {
  if (!grid) return "";
  const last = grid.cells[grid.cells.length - 1];
  return `${grid.originX.toFixed(2)}:${grid.originY.toFixed(2)}:${grid.resolution}:${grid.cells.length}:${last ? last.join(",") : ""}`;
}

export function CityLab({
  kapitel = null,
  notice = null,
  melons = false,
  gates = false,
  ghost = false,
  course = null,
  needBackup = false,
  missionKey = "",
  round = 0,
  spawn = null,
  spawnBoot = 0,
  melonSpots = MELONS,
  melonNote = null,
  onMelonsCleared,
  onGatesCleared,
  onPlay,
  playBusy = false,
  playReady = false,
  runKey = 0,
  timing = false,
  costmapToggle = false,
  walls = false,
}: {
  kapitel?: string | null;
  notice?: ReactNode;
  melons?: boolean;
  gates?: boolean;
  ghost?: boolean;
  course?: Course | null;
  needBackup?: boolean;
  missionKey?: string;
  round?: number;
  spawn?: { x: number; y: number; theta: number } | null;
  spawnBoot?: number;
  melonSpots?: ReadonlyArray<readonly [number, number]>;
  melonNote?: string | null;
  onMelonsCleared?: () => void;
  onGatesCleared?: () => void;
  onPlay?: () => void;
  playBusy?: boolean;
  playReady?: boolean;
  runKey?: number;
  timing?: boolean;
  costmapToggle?: boolean;
  walls?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<CityMap | null>(null);
  const poseRef = useRef({ x: 1.576, y: 5.554, theta: 0 });
  const lapRef = useRef<LapState | null>(null);
  const [lap, setLap] = useState<LapState | null>(null);
  const rangesRef = useRef<Array<number | null> | undefined>(undefined);
  const clutterRef = useRef<Rect[]>([]);
  const costmapRef = useRef<CostmapGrid | null>(null);
  const linkRef = useRef<TwinLink | null>(null);
  const havePose = useRef(false);
  const clientId = useRef(useId());
  const sessionRef = useRef("");
  const generation = useRef(0);
  const [rosUp, setRosUp] = useState(false);
  const [phase, setPhase] = useState<TwinPhase>("connecting");
  const nodeLog = useSyncExternalStore(subscribeRunTerminal, readRunTerminal, serverRunTerminal);
  const [booting, setBooting] = useState(false);
  const [runLive, setRunLive] = useState(false);
  const [stopping, setStopping] = useState(false);
  const stoppingRef = useRef(false);
  const logRef = useRef<HTMLPreElement>(null);
  const [mapUp, setMapUp] = useState(false);
  const [drift, setDrift] = useState(false);
  const [camera, setCamera] = useState(false);
  const [rays, setRays] = useState(false);
  const raysRef = useRef(false);
  raysRef.current = rays;
  const [minBody, setMinBody] = useState(true);
  const minBodyRef = useRef(true);
  minBodyRef.current = minBody;
  const [showCostmap, setShowCostmap] = useState(false);
  const showCostmapRef = useRef(false);
  showCostmapRef.current = showCostmap;
  const costmapToggleRef = useRef(costmapToggle);
  costmapToggleRef.current = costmapToggle;
  useEffect(() => {
    if (!costmapToggle) setShowCostmap(false);
  }, [costmapToggle]);
  const cameraRef = useRef(false);
  const probeRef = useRef<CityProbe | null>(null);
  const titleRef = useRef("");
  const runnerRef = useRef<Rect | null>(null);
  const memoryRef = useRef<ProbeMemory>(emptyMemory());
  const motionRef = useRef({ linear: 0, angular: 0 });
  const kapitelRef = useRef(kapitel);
  kapitelRef.current = kapitel;
  const melonsOnRef = useRef(melons);
  melonsOnRef.current = melons;
  const spotsRef = useRef(melonSpots);
  spotsRef.current = melonSpots;
  const spawnRef = useRef(spawn);
  spawnRef.current = spawn;
  const gatesOnRef = useRef(gates);
  gatesOnRef.current = gates;
  const ghostOnRef = useRef(ghost);
  ghostOnRef.current = ghost;
  const courseRef = useRef(course);
  courseRef.current = course;
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const wallsHitRef = useRef(0);
  const needBackupRef = useRef(needBackup);
  needBackupRef.current = needBackup;
  const trapRef = useRef(false);
  const backedRef = useRef(false);
  const clearedRef = useRef(onMelonsCleared);
  clearedRef.current = onMelonsCleared;
  const gatesClearedRef = useRef(onGatesCleared);
  gatesClearedRef.current = onGatesCleared;
  const lapDoneRef = useRef(false);
  const lapArmedRef = useRef(false);
  const ghostRef = useRef<GhostTake | null>(null);
  const ghostLapRef = useRef<GhostPose[]>([]);
  const ghostHoldRef = useRef<number | null>(null);
  const ghostRunRef = useRef<{ t0: number; line: number } | null>(null);
  const ghostLimitRef = useRef(0);
  const raceNoteRef = useRef("");
  const [raceNote, setRaceNote] = useState("");
  const ghostSawStart = useRef(false);
  const ghostArmAt = useRef(0);
  const ghostGen = useRef(0);
  const seenRunRef = useRef(false);
  const takeGhostRef = useRef(false);
  const [ghostNote, setGhostNote] = useState("");
  const sampleGhostRef = useRef<(sample: TwinState) => void>(() => {});
  const stopGhostRef = useRef<(reason: string) => void>(() => {});
  const [probe, setProbe] = useState<CityProbe | null>(null);
  const [statusText, setStatusText] = useState("");
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const zoomRef = useRef(ZOOM_DEFAULT);
  zoomRef.current = zoom;
  const lookRef = useRef<{ x: number; y: number } | null>(lookForTopRight());
  const dragRef = useRef<{ id: number; x: number; y: number; lookX: number; lookY: number } | null>(null);
  const melonsRef = useRef(freshMelons());
  const [melonsLeft, setMelonsLeft] = useState(MELONS.length);
  const [wallsHit, setWallsHit] = useState(0);

  useLayoutEffect(() => {
    if (!melons) return;
    melonsRef.current = freshMelons(melonSpots);
    setMelonsLeft(melonSpots.length);
  }, [melons, melonSpots, missionKey]);
  const keepGhost = (take: GhostTake) => {
    take.settled = true;
    take.on = false;
    takeGhostRef.current = false;
    const poses = ghostTrace(take.points);
    void commitGhost(take.points).then((result) => {
      if (result.ok && poses.length > 1) ghostLapRef.current = poses;
      setGhostNote(result.note);
    });
  };
  sampleGhostRef.current = (sample) => {
    const take = ghostRef.current;
    if (!take?.on || take.settled) return;
    const now = performance.now();
    if (take.t0 === 0) take.t0 = now;
    const t = (now - take.t0) / 1000;
    if (t > 180) {
      take.settled = true;
      take.on = false;
      setGhostNote("Aufnahme zu lang. Verworfen.");
      return;
    }
    if (take.last < 0 || t - take.last >= 0.1) {
      take.points.push({ t, x: sample.x, y: sample.y, theta: sample.theta });
      take.last = t;
    }
    if (sample.lap?.done) {
      if (take.last < 0 || t - take.last > 1e-3) {
        take.points.push({ t, x: sample.x, y: sample.y, theta: sample.theta });
      }
      keepGhost(take);
      return;
    }
    if (sample.lap?.grass) {
      take.settled = true;
      take.on = false;
      setGhostNote("Gras. Aufnahme verworfen.");
    }
  };
  stopGhostRef.current = (reason) => {
    const take = ghostRef.current;
    if (!take?.on || take.settled) return;
    if (lapRef.current?.done) {
      keepGhost(take);
      return;
    }
    take.settled = true;
    take.on = false;
    if (reason) setGhostNote(reason);
  };

  useEffect(() => {
    if (!ghost) {
      takeGhostRef.current = false;
      stopGhostRef.current("Aufnahme aus.");
    }
  }, [ghost]);

  useEffect(() => {
    if (!ghost) {
      ghostLapRef.current = [];
      ghostHoldRef.current = null;
      ghostRunRef.current = null;
      ghostSawStart.current = false;
      ghostLimitRef.current = 0;
      if (raceNoteRef.current) {
        raceNoteRef.current = "";
        setRaceNote("");
      }
      setGhostNote("");
      return;
    }
    let cancel = false;
    fetch("/api/ghost-lap")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancel) return;
        const poses = ghostPoses(body && typeof body === "object" ? (body as { poses?: unknown }).poses : null);
        if (poses) ghostLapRef.current = poses;
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [ghost]);

  const [mapPin, setMapPin] = useState<MapPin | null>(null);
  const pinTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch(`${ROBOT_API}/city`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const city = parseCity(data);
        if (cancel || !city) return;
        cityRef.current = city;
        if (!havePose.current) poseRef.current = { ...city.start };
        setMapUp(true);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const token = ++generation.current;
    const session = `${clientId.current}:${token}`;
    sessionRef.current = session;
    const link = openTwin({
      onConnection(up) {
        if (generation.current !== token) return;
        setRosUp(up);
        if (up) {
          link.send({ type: "city", enter: true, client: session });
          link.send({ type: "flags", client: session, camera: cameraRef.current });
          const running = courseRef.current;
          if (running) {
            link.send({
              type: "mission",
              client: session,
              obstacles: running.obstacles,
              checkpoints: running.checkpoints,
              walls: wallsRef.current,
            });
          }
          const id = kapitelRef.current;
          if (id) link.send({ type: "probe", client: session, kapitel: id });
        }
      },
      onPhase(next) {
        if (generation.current !== token) return;
        setPhase(next);
      },
      onState(sample: TwinState) {
        havePose.current = true;
        poseRef.current = { x: sample.x, y: sample.y, theta: sample.theta };
        const nextLap = sample.lap ?? null;
        lapRef.current = nextLap;
        setLap((previous) =>
          previous?.text === nextLap?.text && previous?.done === nextLap?.done && previous?.grass === nextLap?.grass
            ? previous
            : nextLap,
        );
        motionRef.current = { linear: sample.linear, angular: sample.angular };
        sampleGhostRef.current(sample);
        if (sample.ranges) rangesRef.current = sample.ranges;
        if (sample.clutter) clutterRef.current = sample.clutter;
        if (sample.costmap !== undefined) costmapRef.current = sample.costmap;
        if (typeof sample.bumps === "number") {
          wallsHitRef.current = sample.bumps;
          setWallsHit((previous) => (previous === sample.bumps ? previous : sample.bumps ?? previous));
        }
        runnerRef.current = sample.runner
          ? { x: sample.runner.x, y: sample.runner.y, w: sample.runner.w, h: sample.runner.h, color: "#ece8d6" }
          : null;
      },
      onDone() {},
    });
    linkRef.current = link;
    link.send({ type: "city", enter: true, client: session });
    return () => {
      link.send({ type: "city", enter: false, client: session });
      link.close();
      if (linkRef.current === link) linkRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lap = lapRef.current;
    if (!gates || !lap || (!lap.done && !lap.grass)) return;
    const start = cityRef.current?.start ?? { x: 1.576, y: 5.554, theta: 0 };
    linkRef.current?.send({
      type: "reset",
      client: sessionRef.current,
      x: start.x,
      y: start.y,
      theta: start.theta,
    });
  }, [gates]);

  useEffect(() => {
    let painted = "";
    const step = () => {
      const pose = poseRef.current;
      const look = lookRef.current;
      const view = look ?? pose;
      const runner = runnerRef.current ?? (probeRef.current?.scene === "dock" ? (cityRef.current?.runner ?? null) : null);
      const frame = frameRef.current;
      const melonsNow = kapitelRef.current || !melonsOnRef.current ? "" : String(melonsRef.current.filter(Boolean).length);
      const boxes = clutterRef.current.map((box) => `${box.x.toFixed(2)}:${box.y.toFixed(2)}`).join(",");
      const run = ghostRunRef.current;
      if (ghostHoldRef.current !== null && !run && ghostOnRef.current) {
        const next = lapRef.current?.next ?? "";
        if (next === "start") ghostSawStart.current = true;
        else if (ghostSawStart.current && next) {
          const offset = ghostHoldRef.current;
          ghostHoldRef.current = null;
          ghostRunRef.current = { t0: performance.now() - offset * 1000, line: offset };
        }
      }
      const clock = ghostRunRef.current;
      const held = ghostHoldRef.current;
      const ghostPose =
        ghostOnRef.current && (held !== null || clock)
          ? ghostAt(ghostLapRef.current, clock ? (performance.now() - clock.t0) / 1000 : (held ?? 0))
          : null;
      let signature = [
        pose.x.toFixed(3),
        pose.y.toFixed(3),
        pose.theta.toFixed(3),
        ghostPose ? `${ghostPose.x.toFixed(2)}:${ghostPose.y.toFixed(2)}:${ghostPose.theta.toFixed(2)}` : "",
        view.x.toFixed(3),
        view.y.toFixed(3),
        zoomRef.current,
        raysRef.current ? "1" : "0",
        minBodyRef.current ? "1" : "0",
        frame?.clientWidth ?? 0,
        frame?.clientHeight ?? 0,
        window.devicePixelRatio || 1,
        melonsNow,
        runner ? `${runner.x.toFixed(2)}:${runner.y.toFixed(2)}` : "",
        boxes,
        probeRef.current?.kapitel ?? "",
        probeRef.current?.scene ?? "",
        gatesOnRef.current ? "1" : "0",
        (courseRef.current?.checkpoints ?? []).map((gate) => gate.id).join(","),
        lapRef.current?.next ?? "",
        lapRef.current?.done ? "1" : "0",
        lapRef.current?.grass ? "1" : "0",
        costmapToggleRef.current && showCostmapRef.current ? costmapKey(costmapRef.current) : "",
      ].join("|");
      if (raysRef.current && rangesRef.current) {
        signature += rangesRef.current.map((range) => (range == null ? "-" : range.toFixed(2))).join(",");
      }
      if (signature !== painted) {
        painted = signature;
        draw(
          canvasRef.current,
          frameRef.current,
          cityRef.current,
          pose,
          rangesRef.current,
          clutterRef.current,
          raysRef.current,
          zoomRef.current,
          probeRef.current,
          runner,
          look,
          kapitelRef.current || !melonsOnRef.current ? null : melonsRef.current,
          minBodyRef.current,
          gatesOnRef.current ? lapRef.current : null,
          gatesOnRef.current,
          courseRef.current?.checkpoints ?? null,
          ghostPose,
          spotsRef.current,
          costmapToggleRef.current && showCostmapRef.current ? costmapRef.current : null,
        );
      }
      const runningCourse = courseRef.current;
      const here = poseRef.current;
      if (runningCourse?.later?.length && runningCourse.trigger && !trapRef.current) {
        const line = runningCourse.trigger;
        if (here.x > line.x && here.y >= line.yMin && here.y <= line.yMax) {
          trapRef.current = true;
          linkRef.current?.send({
            type: "mission",
            client: sessionRef.current,
            obstacles: runningCourse.later,
            checkpoints: runningCourse.checkpoints,
            walls: wallsRef.current,
          });
        }
      }
      if (needBackupRef.current && motionRef.current.linear < -0.03 && !backedRef.current) {
        backedRef.current = true;
        if (melonsOnRef.current && melonsRef.current.length > 0 && melonsRef.current.every((alive) => !alive)) {
          if (!wallsRef.current || wallsHitRef.current === 0) clearedRef.current?.();
        }
      }
      if (!kapitelRef.current && melonsOnRef.current) {
        const pose = poseRef.current;
        if (holdMelons.current) {
          const home = spawnRef.current ?? cityRef.current?.start;
          if (!home || Math.hypot(pose.x - home.x, pose.y - home.y) < 0.25) holdMelons.current = false;
        }
        const next = holdMelons.current ? melonsRef.current : takeMelons(melonsRef.current, pose.x, pose.y, spotsRef.current);
        if (next !== melonsRef.current) {
          melonsRef.current = next;
          const left = next.filter(Boolean).length;
          setMelonsLeft(left);
          if (left === 0 && (!needBackupRef.current || backedRef.current) && (!wallsRef.current || wallsHitRef.current === 0)) {
            clearedRef.current?.();
          }
        }
      }
      const gatesOn = gatesOnRef.current;
      const lapDone = Boolean(lapRef.current?.done);
      if (!gatesOn) lapArmedRef.current = false;
      else if (!lapDone) lapArmedRef.current = true;
      if (gatesOn && lapDone && lapArmedRef.current && !lapDoneRef.current) {
        const run = ghostRunRef.current;
        const limit = ghostLimitRef.current;
        const student = run ? (performance.now() - run.t0) / 1000 - run.line : Number.POSITIVE_INFINITY;
        if (ghostOnRef.current && limit > 0 && student > limit + 0.05) {
          const text = `Zu langsam. ${formatDe(student, 1)} s, der Geist ${formatDe(limit, 1)} s.`;
          if (raceNoteRef.current !== text) {
            raceNoteRef.current = text;
            setRaceNote(text);
          }
          ghostRunRef.current = null;
          ghostHoldRef.current = null;
          ghostSawStart.current = false;
          const start = cityRef.current?.start ?? { x: 1.576, y: 5.554, theta: 0 };
          linkRef.current?.send({
            type: "reset",
            client: sessionRef.current,
            x: start.x,
            y: start.y,
            theta: start.theta,
          });
        } else {
          gatesClearedRef.current?.();
        }
      }
      lapDoneRef.current = gatesOn && lapDone;
      const current = probeRef.current;
      if (current) {
        const runner = runnerRef.current;
        const report = probeStatus(
          current,
          poseRef.current,
          motionRef.current.linear,
          motionRef.current.angular,
          rangesRef.current,
          runner ? { x: runner.x + runner.w / 2, y: runner.y + runner.h / 2 } : null,
          memoryRef.current,
          titleRef.current,
        );
        setStatusText((previous) => (previous === report.text ? previous : report.text));
      }
    };
    step();
    const id = window.setInterval(step, 50);
    return () => {
      window.clearInterval(id);
    };
  }, [mapUp]);

  titleRef.current = kapitel ?? "";

  useEffect(() => {
    memoryRef.current = emptyMemory();
    setStatusText("");
    if (!kapitel) {
      probeRef.current = null;
      setProbe(null);
      return;
    }
    let cancel = false;
    fetch(`${ROBOT_API}/city/probe/${kapitel}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const next = parseProbe(data);
        if (cancel) return;
        probeRef.current = next;
        setProbe(next);
        if (next && !havePose.current) {
          poseRef.current = { x: next.start.x, y: next.start.y, theta: next.start.theta ?? 0 };
        }
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [kapitel]);

  useEffect(() => {
    if (!rosUp) return;
    linkRef.current?.send({
      type: "probe",
      client: sessionRef.current,
      kapitel: kapitel ?? "",
    });
  }, [kapitel, rosUp]);

  const courseKey = JSON.stringify(course ?? null);
  const courseWasOn = useRef(false);
  useEffect(() => {
    trapRef.current = false;
    backedRef.current = false;
    if (!rosUp) return;
    if (!courseRef.current && !courseWasOn.current) return;
    courseWasOn.current = courseRef.current !== null;
    const running = courseRef.current;
    linkRef.current?.send({
      type: "mission",
      client: sessionRef.current,
      obstacles: running?.obstacles ?? [],
      checkpoints: running?.checkpoints ?? null,
      walls: wallsRef.current,
    });
  }, [courseKey, rosUp, round]);

  const roundSeen = useRef(round);
  const holdMelons = useRef(false);
  const placeAt = (home: { x: number; y: number; theta: number }) => {
    poseRef.current = { x: home.x, y: home.y, theta: home.theta };
    havePose.current = true;
    const origin = cityRef.current?.start;
    if (origin && Math.hypot(home.x - origin.x, home.y - origin.y) > 0.5) {
      lookRef.current = { x: home.x, y: home.y };
    }
    linkRef.current?.send({
      type: "reset",
      client: sessionRef.current,
      x: home.x,
      y: home.y,
      theta: home.theta,
    });
  };
  useEffect(() => {
    if (roundSeen.current === round) return;
    roundSeen.current = round;
    const take = ghostRef.current;
    if (take?.on && !take.settled) {
      take.t0 = 0;
      take.last = -1;
      take.points = [];
    }
    const keepGhostHold = ghostOnRef.current && performance.now() - ghostArmAt.current < 800;
    ghostRunRef.current = null;
    if (!keepGhostHold) {
      ghostHoldRef.current = null;
      ghostSawStart.current = false;
    }
    if (melonsOnRef.current) {
      holdMelons.current = true;
      melonsRef.current = freshMelons(spotsRef.current);
      setMelonsLeft(spotsRef.current.length);
    }
    const start = cityRef.current?.start ?? { x: 1.576, y: 5.554, theta: 0 };
    const home = spawnRef.current ?? start;
    placeAt(home);
  }, [round]);

  const spawnSeen = useRef("");
  useEffect(() => {
    if (!rosUp || !spawn) {
      spawnSeen.current = "";
      return;
    }
    const key = `${spawn.x}:${spawn.y}:${spawn.theta}:${spawnBoot}`;
    if (spawnSeen.current === key) return;
    spawnSeen.current = key;
    placeAt(spawn);
  }, [spawnBoot, rosUp, spawn]);

  const sendFlags = (nextDrift: boolean, nextCamera: boolean) => {
    cameraRef.current = nextCamera;
    linkRef.current?.send({
      type: "flags",
      client: sessionRef.current,
      drift: nextDrift,
      camera: nextCamera,
    });
  };

  const reset = () => {
    memoryRef.current = emptyMemory();
    trapRef.current = false;
    backedRef.current = false;
    if (melonsOnRef.current) holdMelons.current = true;
    melonsRef.current = freshMelons(spotsRef.current);
    setMelonsLeft(spotsRef.current.length);
    const origin = probeRef.current?.start;
    const home =
      spawnRef.current ??
      (origin
        ? { x: origin.x, y: origin.y, theta: origin.theta ?? 0 }
        : (cityRef.current?.start ?? { x: 1.576, y: 5.554, theta: 0 }));
    placeAt(home);
    const running = courseRef.current;
    if (running) {
      linkRef.current?.send({
        type: "mission",
        client: sessionRef.current,
        obstacles: running.obstacles,
        checkpoints: running.checkpoints,
        walls: wallsRef.current,
      });
    }
  };

  const cssPpm = () => {
    const frame = frameRef.current;
    if (!frame) return 1;
    const rect = frame.getBoundingClientRect();
    return cityPpm(rect.width, rect.height, zoomRef.current) || 1;
  };

  const onPanDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    const pose = poseRef.current;
    const look = lookRef.current ?? { x: pose.x, y: pose.y };
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lookX: look.x, lookY: look.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPanMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) < 3) return;
    const ppm = cssPpm();
    lookRef.current = { x: drag.lookX - dx / ppm, y: drag.lookY + dy / ppm };
  };

  const onPanEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
  };

  const recenter = () => {
    lookRef.current = null;
    dragRef.current = null;
  };

  const onMapMenu = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const view = lookRef.current ?? poseRef.current;
    const ppm = cssPpm();
    let x = view.x + (sx - rect.width / 2) / ppm;
    let y = view.y - (sy - rect.height / 2) / ppm;
    if (!kapitel && melonsOnRef.current) {
      const melon = nearestMelon(x, y, 0.35, spotsRef.current);
      if (melon) {
        x = melon[0];
        y = melon[1];
      }
    }
    const theta = poseRef.current.theta;
    const labelW = 196;
    const left = sx + 12 + labelW > rect.width ? Math.max(4, sx - labelW - 8) : sx + 12;
    const top = sy < 22 ? sy + 12 : sy - 18;
    setMapPin({ left, top, x, y, theta });
    copyPoint(pointClip(x, y, theta));
    if (pinTimer.current !== null) window.clearTimeout(pinTimer.current);
    pinTimer.current = window.setTimeout(() => {
      pinTimer.current = null;
      setMapPin(null);
    }, 1600);
  };

  useEffect(() => {
    return () => {
      if (pinTimer.current !== null) window.clearTimeout(pinTimer.current);
    };
  }, []);

  useEffect(() => {
    if (playBusy) return;
    const gen = ghostGen.current;
    const timer = window.setTimeout(() => {
      if (gen !== ghostGen.current || seenRunRef.current) return;
      stopGhostRef.current("Fahrt nicht gestartet. Aufnahme verworfen.");
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [playBusy]);

  useEffect(() => {
    let cancel = false;
    let timer = 0;
    let abandon = 0;
    const tick = async () => {
      try {
        const response = await fetch("/api/waypoint-run");
        const body = (await response.json()) as { log?: string; starting?: boolean; running?: boolean };
        if (cancel) return;
        const log = typeof body.log === "string" ? body.log : "";
        noteRunPhase(body.starting === true, body.running === true, log);
        setBooting(body.starting === true && log.trim() === "" && !readRunTerminal().trim());
        const serverLive = body.running === true || body.starting === true;
        setRunLive(serverLive);
        const active = playBusy || serverLive;
        if (body.running === true || body.starting === true) seenRunRef.current = true;
        if (!active) {
          if (seenRunRef.current) {
            seenRunRef.current = false;
            const gen = ghostGen.current;
            abandon = window.setTimeout(() => {
              if (gen !== ghostGen.current) return;
              stopGhostRef.current("Runde nicht geschafft. Aufnahme verworfen.");
            }, 400);
          }
          return;
        }
        timer = window.setTimeout(() => void tick(), 1000);
      } catch {
        if (cancel) return;
        if (playBusy) setRunTerminal("Der Knoten ist nicht erreichbar.");
        setBooting(false);
        if (playBusy) timer = window.setTimeout(() => void tick(), 1000);
      }
    };
    void tick();
    return () => {
      cancel = true;
      window.clearTimeout(timer);
      window.clearTimeout(abandon);
    };
  }, [playBusy]);

  useEffect(() => {
    const box = logRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [nodeLog]);

  const showStop = playBusy || runLive || stopping;

  return (
    <div className="flex flex-col gap-4">
      {probe ? (
        <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm">
          <p className="font-mono text-xs text-muted-foreground">{probe.kapitel}</p>
          <p className="mt-1">{probe.task}</p>
          <p className="mt-2 text-muted-foreground">{statusText || probe.task}</p>
        </div>
      ) : null}
      <div
        ref={frameRef}
        className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border border-border bg-[#4098d8]"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={onPanDown}
          onPointerMove={onPanMove}
          onPointerUp={onPanEnd}
          onPointerCancel={onPanEnd}
          onContextMenu={onMapMenu}
        />
        <MapClock runKey={runKey} running={timing} />
        <span
          role="status"
          title={phase === "up" ? "Verbunden" : phase === "connecting" ? "Verbinde" : "Nicht verbunden"}
          aria-label={phase === "up" ? "Verbunden" : phase === "connecting" ? "Verbinde" : "Nicht verbunden"}
          className={`absolute top-3 left-3 z-10 size-2.5 rounded-full ring-2 ring-neutral-900/80 ${
            phase === "up" ? "bg-emerald-500" : phase === "connecting" ? "bg-amber-400" : "bg-red-500"
          }`}
        />
        {gates && lap ? (
          <p
            className={`absolute bottom-14 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-full px-3 py-1 text-center text-xs font-semibold ${
              raceNote
                ? "bg-[#4a3414]/90 text-[#ffe7c2]"
                : lap.grass
                  ? "bg-[#4a1c14]/90 text-[#ffd0c8]"
                  : lap.done
                    ? "bg-[#14301c]/90 text-[#d7ffe4]"
                    : "bg-[#1c1404]/80 text-[#f4efe4]"
            }`}
          >
            {raceNote || lap.text}
          </p>
        ) : null}
        {!kapitel && (melons || walls) ? (
          <div className="absolute top-3 left-8 z-10 flex max-w-[18rem] flex-col gap-1">
            {melons ? (
              <p className="w-fit rounded-full bg-[#1c1404]/80 px-3 py-1 text-xs font-semibold text-[#f4efe4]">
                {melonsLeft === 0 ? "Alle Melonen" : `Melonen ${spotsRef.current.length - melonsLeft}/${spotsRef.current.length}`}
              </p>
            ) : null}
            {walls ? (
              <p className="w-fit rounded-full bg-[#1c1404]/80 px-3 py-1 text-xs font-semibold text-[#f4efe4]">
                {wallsHit === 1 ? "Wand 1" : `Wände ${wallsHit}`}
              </p>
            ) : null}
            {melonNote ? (
              <p className="max-w-full rounded-xl bg-[#1c1404]/80 px-3 py-1 text-xs leading-4 font-semibold text-[#f4efe4]">
                {melonNote}
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="pointer-events-none absolute top-2 right-2 z-10 rounded bg-neutral-700/80 px-2 py-0.5 text-[0.7rem] text-neutral-300">
          Sichtfenster {formatDe(CITY_VIEW_W / zoom, 1)} m mal {formatDe(CITY_VIEW_H / zoom, 1)} m
        </p>
        {notice}
        {mapPin ? (
          <span
            className="pointer-events-none absolute z-10 font-mono text-xs whitespace-nowrap text-[#d6f6ff]"
            style={{ left: mapPin.left, top: mapPin.top, textShadow: "0 1px 2px rgba(17,19,24,0.9)" }}
          >
            {formatDe(mapPin.x, 2)} m, {formatDe(mapPin.y, 2)} m, {formatDe(wrapAngle(mapPin.theta), 2)}
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 flex items-center gap-1">
          <Button type="button" aria-label="Herauszoomen" onClick={() => setZoom((current) => clampZoom(current / 1.25))}>
            −
          </Button>
          <Button type="button" aria-label="Hineinzoomen" onClick={() => setZoom((current) => clampZoom(current * 1.25))}>
            +
          </Button>
        </div>
        <Button
          type="button"
          aria-label="Auf das Auto zentrieren"
          className="absolute right-3 bottom-3 size-9 px-0"
          onClick={recenter}
        >
          <LocateFixed className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FlagBox
              on={drift}
              disabled={!rosUp}
              onToggle={() => {
                const next = !drift;
                setDrift(next);
                sendFlags(next, camera);
              }}
            >
              Drift
            </FlagBox>
            <FlagBox on={rays} onToggle={() => setRays((current) => !current)}>
              Lidar-Strahlen
            </FlagBox>
            <FlagBox
              on={minBody}
              title="Zeichnet das Auto größer als in echt, damit es beim Herauszoomen sichtbar bleibt. Aus zeigt die echte Größe."
              onToggle={() => setMinBody((current) => !current)}
            >
              Vergrößert
            </FlagBox>
            {costmapToggle ? (
              <FlagBox
                on={showCostmap}
                title="Legt die globale Costmap von Nav2 über die ganze Karte. Das Auto bleibt davor."
                onToggle={() => setShowCostmap((current) => !current)}
              >
                Costmap
              </FlagBox>
            ) : null}
            <FlagBox
              on={camera}
              disabled={!rosUp}
              title="Rendert /camera/image_raw. Aus lässt den Rechner ruhiger."
              onToggle={() => {
                const next = !camera;
                setCamera(next);
                sendFlags(drift, next);
              }}
            >
              Kamerabild
            </FlagBox>
          </div>
          <Button type="button" autoComplete="off" onClick={reset} disabled={!rosUp}>
            Zurücksetzen
          </Button>
        </div>
        <div className={`flex items-center gap-2 ${onPlay ? "w-[85%]" : ""}`}>
          {onPlay ? (
            <button
              type="button"
              aria-label={showStop ? "Nav2 stoppen" : "Code abspielen"}
              autoComplete="off"
              onClick={() => {
                if (showStop) {
                  if (stoppingRef.current) return;
                  stoppingRef.current = true;
                  setStopping(true);
                  holdRunTerminal("Stoppe Nav2.");
                  void fetch("/api/waypoint-run", { method: "DELETE" })
                    .then((response) => {
                      if (!response.ok) {
                        setRunTerminal("Nav2 ließ sich nicht stoppen.");
                        return;
                      }
                      setRunTerminal("Nav2 gestoppt.");
                    })
                    .catch(() => setRunTerminal("Nav2 ließ sich nicht stoppen."))
                    .finally(() => {
                      stoppingRef.current = false;
                      setStopping(false);
                    });
                  return;
                }
                reset();
                if (ghost && takeGhostRef.current) {
                  ghostGen.current += 1;
                  seenRunRef.current = false;
                  ghostRef.current = { on: true, settled: false, t0: 0, last: -1, points: [] };
                  setGhostNote("Aufnahme läuft.");
                }
                const armGhost = ghost && ghostLapRef.current.length > 1;
                if (raceNoteRef.current) {
                  raceNoteRef.current = "";
                  setRaceNote("");
                }
                if (armGhost) {
                  const line = courseRef.current?.checkpoints.find((gate) => gate.id === "start");
                  const x = line ? (line.x0 + line.x1) / 2 : 1.76;
                  const race = ghostRace(ghostLapRef.current, x);
                  ghostArmAt.current = performance.now();
                  ghostSawStart.current = false;
                  ghostRunRef.current = null;
                  ghostHoldRef.current = race ? race.line : ghostCrossTime(ghostLapRef.current, x);
                  ghostLimitRef.current = race?.lap ?? 0;
                }
                onPlay();
              }}
              disabled={showStop ? stopping : !playReady}
              className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm disabled:opacity-60 ${showStop ? "bg-[#9d2c2c]" : "bg-[#2f6b4f]"}`}
            >
              {showStop ? (
                <Square className="size-3.5 fill-current" />
              ) : (
                <Play className="size-4 translate-x-px fill-current" />
              )}
            </button>
          ) : null}
          <div className="relative min-w-0 flex-1">
            <pre
              ref={logRef}
              aria-label="Ausgabe von waypoint_client"
              aria-busy={booting}
              className="box-content h-24 overflow-auto rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 font-mono text-xs leading-4 whitespace-pre text-neutral-300"
            >
              {booting && !nodeLog.trim() ? "" : nodeLog}
            </pre>
            {booting && !nodeLog.trim() ? <TwinOrbit /> : null}
          </div>
        </div>
        {ghostNote ? <p className="text-sm leading-6 text-muted-foreground">{ghostNote}</p> : null}
      </div>
    </div>
  );
}

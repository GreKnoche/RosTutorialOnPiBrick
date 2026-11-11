"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { LocateFixed, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseCity, type CityMap, type LapState, type Rect } from "@/lib/city-map";
import { draw } from "@/lib/city-paint";
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
import { MELONS, freshMelons, nearestMelon, takeMelons } from "@/lib/melons";
import { ROBOT_API, openTwin, type TwinLink, type TwinPhase, type TwinState } from "@/lib/twin-socket";

type MapPin = { left: number; top: number; x: number; y: number };

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

function clipNumber(value: number) {
  const trimmed = value.toFixed(2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed.includes(".") ? trimmed : `${trimmed}.0`;
}

function pointClip(x: number, y: number) {
  return `(${clipNumber(x)}, ${clipNumber(y)}, 0.0)`;
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

export function CityLab({
  kapitel = null,
  notice = null,
  melons = false,
  gates = false,
  onMelonsCleared,
  onGatesCleared,
  onPlay,
  playBusy = false,
  playReady = false,
}: {
  kapitel?: string | null;
  notice?: ReactNode;
  melons?: boolean;
  gates?: boolean;
  onMelonsCleared?: () => void;
  onGatesCleared?: () => void;
  onPlay?: () => void;
  playBusy?: boolean;
  playReady?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<CityMap | null>(null);
  const poseRef = useRef({ x: 1.6, y: 5.54, theta: 0 });
  const lapRef = useRef<LapState | null>(null);
  const [lap, setLap] = useState<LapState | null>(null);
  const rangesRef = useRef<Array<number | null> | undefined>(undefined);
  const clutterRef = useRef<Rect[]>([]);
  const linkRef = useRef<TwinLink | null>(null);
  const havePose = useRef(false);
  const clientId = useRef(useId());
  const sessionRef = useRef("");
  const generation = useRef(0);
  const [rosUp, setRosUp] = useState(false);
  const [phase, setPhase] = useState<TwinPhase>("connecting");
  const [nodeLog, setNodeLog] = useState("");
  const [booting, setBooting] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  const [mapUp, setMapUp] = useState(false);
  const [drift, setDrift] = useState(false);
  const [clutter, setClutter] = useState(false);
  const [camera, setCamera] = useState(false);
  const [rays, setRays] = useState(false);
  const raysRef = useRef(false);
  raysRef.current = rays;
  const [minBody, setMinBody] = useState(true);
  const minBodyRef = useRef(true);
  minBodyRef.current = minBody;
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
  const gatesOnRef = useRef(gates);
  gatesOnRef.current = gates;
  const clearedRef = useRef(onMelonsCleared);
  clearedRef.current = onMelonsCleared;
  const gatesClearedRef = useRef(onGatesCleared);
  gatesClearedRef.current = onGatesCleared;
  const lapDoneRef = useRef(false);
  const lapArmedRef = useRef(false);
  const [probe, setProbe] = useState<CityProbe | null>(null);
  const [statusText, setStatusText] = useState("");
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const zoomRef = useRef(ZOOM_DEFAULT);
  zoomRef.current = zoom;
  const lookRef = useRef<{ x: number; y: number } | null>(lookForTopRight());
  const dragRef = useRef<{ id: number; x: number; y: number; lookX: number; lookY: number } | null>(null);
  const melonsRef = useRef(freshMelons());
  const [melonsLeft, setMelonsLeft] = useState(MELONS.length);

  useLayoutEffect(() => {
    if (!melons) return;
    melonsRef.current = freshMelons();
    setMelonsLeft(MELONS.length);
  }, [melons]);
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
        if (sample.ranges) rangesRef.current = sample.ranges;
        if (sample.clutter) clutterRef.current = sample.clutter;
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
    const start = cityRef.current?.start ?? { x: 1.6, y: 5.54, theta: 0 };
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
      let signature = [
        pose.x.toFixed(3),
        pose.y.toFixed(3),
        pose.theta.toFixed(3),
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
        lapRef.current?.next ?? "",
        lapRef.current?.done ? "1" : "0",
        lapRef.current?.grass ? "1" : "0",
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
        );
      }
      if (!kapitelRef.current && melonsOnRef.current) {
        const pose = poseRef.current;
        const next = takeMelons(melonsRef.current, pose.x, pose.y);
        if (next !== melonsRef.current) {
          melonsRef.current = next;
          const left = next.filter(Boolean).length;
          setMelonsLeft(left);
          if (left === 0) clearedRef.current?.();
        }
      }
      const gatesOn = gatesOnRef.current;
      const lapDone = Boolean(lapRef.current?.done);
      if (!gatesOn) lapArmedRef.current = false;
      else if (!lapDone) lapArmedRef.current = true;
      if (gatesOn && lapDone && lapArmedRef.current && !lapDoneRef.current) gatesClearedRef.current?.();
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

  const sendFlags = (nextDrift: boolean, nextClutter: boolean, nextCamera: boolean) => {
    cameraRef.current = nextCamera;
    linkRef.current?.send({
      type: "flags",
      client: sessionRef.current,
      drift: nextDrift,
      clutter: nextClutter,
      camera: nextCamera,
    });
  };

  const reset = () => {
    memoryRef.current = emptyMemory();
    melonsRef.current = freshMelons();
    setMelonsLeft(MELONS.length);
    const origin = probeRef.current?.start;
    const start = origin
      ? { x: origin.x, y: origin.y, theta: origin.theta ?? 0 }
      : (cityRef.current?.start ?? { x: 1.6, y: 5.54, theta: 0 });
    linkRef.current?.send({
      type: "reset",
      client: sessionRef.current,
      x: start.x,
      y: start.y,
      theta: start.theta,
    });
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
      const melon = nearestMelon(x, y);
      if (melon) {
        x = melon[0];
        y = melon[1];
      }
    }
    const labelW = 148;
    const left = sx + 12 + labelW > rect.width ? Math.max(4, sx - labelW - 8) : sx + 12;
    const top = sy < 22 ? sy + 12 : sy - 18;
    setMapPin({ left, top, x, y });
    copyPoint(pointClip(x, y));
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
    let cancel = false;
    const tick = async () => {
      try {
        const response = await fetch("/api/waypoint-run");
        const body = (await response.json()) as { log?: string; starting?: boolean };
        if (cancel) return;
        const log = typeof body.log === "string" ? body.log : "";
        setNodeLog(log);
        setBooting(body.starting === true && log.trim() === "");
      } catch {
        if (!cancel) {
          setNodeLog("");
          setBooting(false);
        }
      }
    };
    const timer = window.setInterval(() => void tick(), 1000);
    void tick();
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const box = logRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [nodeLog]);

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
              lap.grass ? "bg-[#4a1c14]/90 text-[#ffd0c8]" : lap.done ? "bg-[#14301c]/90 text-[#d7ffe4]" : "bg-[#1c1404]/80 text-[#f4efe4]"
            }`}
          >
            {lap.text}
          </p>
        ) : null}
        {!kapitel && melons ? (
          <p className="absolute top-3 left-8 rounded-full bg-[#1c1404]/80 px-3 py-1 text-xs font-semibold text-[#f4efe4]">
            {melonsLeft === 0 ? "Alle Melonen" : `Melonen ${MELONS.length - melonsLeft}/${MELONS.length}`}
          </p>
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
            {formatDe(mapPin.x, 2)} m, {formatDe(mapPin.y, 2)} m
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={drift}
                disabled={!rosUp}
                onChange={(event) => {
                  const next = event.target.checked;
                  setDrift(next);
                  sendFlags(next, clutter, camera);
                }}
              />
              Drift
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={probe ? probe.scene === "kegel" : clutter}
                disabled={!rosUp || probe !== null}
                onChange={(event) => {
                  const next = event.target.checked;
                  setClutter(next);
                  sendFlags(drift, next, camera);
                }}
              />
              Hindernisse
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={rays} onChange={(event) => setRays(event.target.checked)} />
              Lidar-Strahlen
            </label>
            <label
              className="flex items-center gap-2"
              title="Zeichnet das Auto größer als in echt, damit es beim Herauszoomen sichtbar bleibt. Aus zeigt die echte Größe."
            >
              <input type="checkbox" checked={minBody} onChange={(event) => setMinBody(event.target.checked)} />
              Vergrößert
            </label>
            <label className="flex items-center gap-2" title="Rendert /camera/image_raw. Aus lässt den Rechner ruhiger.">
              <input
                type="checkbox"
                checked={camera}
                disabled={!rosUp}
                onChange={(event) => {
                  const next = event.target.checked;
                  setCamera(next);
                  sendFlags(drift, clutter, next);
                }}
              />
              Kamerabild
            </label>
          </div>
          <Button type="button" onClick={reset} disabled={!rosUp}>
            Zurücksetzen
          </Button>
        </div>
        <div className={`flex items-center gap-2 ${onPlay ? "w-[85%]" : ""}`}>
          {onPlay ? (
            <button
              type="button"
              aria-label="Code abspielen"
              onClick={onPlay}
              disabled={!playReady || playBusy}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2f6b4f] text-white shadow-sm disabled:opacity-60"
            >
              <Play className="size-4 translate-x-px fill-current" />
            </button>
          ) : null}
          <div className="relative min-w-0 flex-1">
            <pre
              ref={logRef}
              aria-label="Ausgabe von waypoint_client"
              aria-busy={booting}
              className="box-content h-8 overflow-auto rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 font-mono text-xs leading-4 whitespace-pre text-neutral-300"
            >
              {booting ? "" : nodeLog}
            </pre>
            {booting ? <TwinOrbit /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

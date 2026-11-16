"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Check, Play } from "lucide-react";
import { useDebugAdmin } from "@/lib/debug-admin";

export type PathStep = {
  id: string;
  title: string;
  name?: string;
  colors?: PathColors;
};

export type PathColors = {
  fill: string;
  shade: string;
  liveEdge: string;
  ink: string;
  liveInk: string;
  startInk: string;
};

type Phase = "wait" | "along" | "dock";

type Pose = {
  x: number;
  y: number;
  heading: number;
};

const ASPHALT = "#454c5a";
const EMPTY_DONE: Partial<Record<string, boolean>> = {};
const HAIRPIN = 72;
const ROAD_INSET = 22;

type Point = { x: number; y: number };

function fmt(n: number) {
  return n.toFixed(1);
}

/** Switchback centerline: each lesson is a hairpin, the next one sits on the other side. */
function serpentinePolyline(nodes: Point[]): Point[] {
  if (nodes.length === 0) return [];
  const pts: Point[] = [{ ...nodes[0] }];
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    pts.push({ x: to.x, y: from.y });
    pts.push({ x: to.x, y: to.y });
  }
  return pts;
}

function trimPolyline(points: Point[], inset: number): Point[] {
  if (points.length < 2 || inset <= 0) return points;
  const out = points.map((point) => ({ ...point }));
  const startDx = out[1].x - out[0].x;
  const startDy = out[1].y - out[0].y;
  const startLen = Math.hypot(startDx, startDy) || 1;
  const startCut = Math.min(inset, startLen / 2);
  out[0] = {
    x: out[0].x + (startDx / startLen) * startCut,
    y: out[0].y + (startDy / startLen) * startCut,
  };
  const last = out.length - 1;
  const endDx = out[last].x - out[last - 1].x;
  const endDy = out[last].y - out[last - 1].y;
  const endLen = Math.hypot(endDx, endDy) || 1;
  const endCut = Math.min(inset, endLen / 2);
  out[last] = {
    x: out[last].x - (endDx / endLen) * endCut,
    y: out[last].y - (endDy / endLen) * endCut,
  };
  return out;
}

function roundedPolyline(points: Point[], radius: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const inDx = curr.x - prev.x;
    const inDy = curr.y - prev.y;
    const outDx = next.x - curr.x;
    const outDy = next.y - curr.y;
    const inLen = Math.hypot(inDx, inDy) || 1;
    const outLen = Math.hypot(outDx, outDy) || 1;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const enter = { x: curr.x - (inDx / inLen) * r, y: curr.y - (inDy / inLen) * r };
    const leave = { x: curr.x + (outDx / outLen) * r, y: curr.y + (outDy / outLen) * r };
    d += ` L ${fmt(enter.x)} ${fmt(enter.y)} Q ${fmt(curr.x)} ${fmt(curr.y)} ${fmt(leave.x)} ${fmt(leave.y)}`;
  }
  const end = points[points.length - 1];
  d += ` L ${fmt(end.x)} ${fmt(end.y)}`;
  return d;
}

function serpentinePath(nodes: Point[]): string {
  return roundedPolyline(trimPolyline(serpentinePolyline(nodes), ROAD_INSET), HAIRPIN);
}

function measureCenters(list: HTMLElement, nodes: (HTMLElement | null)[], count: number): Point[] | null {
  const listBox = list.getBoundingClientRect();
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const node = nodes[i];
    if (!node) return null;
    const box = node.getBoundingClientRect();
    points.push({
      x: box.left + box.width / 2 - listBox.left,
      y: box.top + box.height / 2 - listBox.top,
    });
  }
  return points;
}

function pathLengths(d: string) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  return el;
}

/** Park just clear of a station, on the road that arrives there. The start sits on the way out. */
function parkPercent(d: string, nodes: Point[], index: number, dock: boolean): number {
  const el = pathLengths(d);
  const total = el.getTotalLength();
  if (total <= 0) return 0;
  const here = nodes[index];
  if (!here) return 0;
  const clearance = index === 0 ? 46 : dock ? 30 : 44;
  const steps = Math.max(1, Math.ceil(total / 2));
  if (index === 0) {
    for (let i = 0; i <= steps; i++) {
      const len = (total * i) / steps;
      const p = el.getPointAtLength(len);
      if (Math.hypot(p.x - here.x, p.y - here.y) >= clearance) return (len / total) * 100;
    }
    return 8;
  }
  for (let i = 0; i <= steps; i++) {
    const len = (total * i) / steps;
    const p = el.getPointAtLength(len);
    if (Math.hypot(p.x - here.x, p.y - here.y) <= clearance) {
      return (Math.max(0, len) / total) * 100;
    }
  }
  return (el.getTotalLength() / total) * 100;
}

export const NAV2_PATH_COLORS: PathColors = {
  fill: "#e6b325",
  shade: "#a67c12",
  liveEdge: "#6e4e08",
  ink: "#3c3214",
  liveInk: "#2a1c08",
  startInk: "#1c1404",
};

function measurePose(list: HTMLElement, road: HTMLElement, node: HTMLElement, dock: boolean, index: number): Pose {
  const listBox = list.getBoundingClientRect();
  const roadBox = road.getBoundingClientRect();
  const nodeBox = node.getBoundingClientRect();
  const y = nodeBox.top + nodeBox.height / 2 - listBox.top;
  const roadX = roadBox.left + roadBox.width / 2 - listBox.left;
  if (!dock) return { x: roadX, y, heading: 90 };
  const left = index % 2 === 0;
  const stub = 24;
  return {
    x: left ? nodeBox.right - listBox.left + stub : nodeBox.left - listBox.left - stub,
    y,
    heading: left ? 180 : 0,
  };
}

function MiniTwin() {
  return (
    <svg viewBox="-20 -16 42 32" className="size-full overflow-visible" aria-hidden>
      <rect x="-16" y="-11" width="32" height="22" rx="4" fill="#e11d2e" stroke="#fff7ed" strokeWidth="1.6" />
      <rect x="-6" y="-15" width="12" height="4" rx="1" fill="#111318" stroke="#fff7ed" strokeWidth="0.7" />
      <rect x="-6" y="11" width="12" height="4" rx="1" fill="#111318" stroke="#fff7ed" strokeWidth="0.7" />
      <polygon points="22,0 12,-6.5 12,6.5" fill="#fff7ed" />
    </svg>
  );
}

function SerpentineRoad({ d }: { d: string }) {
  if (!d) return null;
  const edge = {
    d,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-0 size-full overflow-visible">
      <path {...edge} stroke="#2a303a" strokeWidth={48} />
      <path {...edge} stroke="#f7f4ee" strokeWidth={42} />
      <path {...edge} stroke={ASPHALT} strokeWidth={36} />
      <path
        {...edge}
        stroke="#f7f4ee"
        strokeWidth={3}
        strokeDasharray="12 14"
        strokeLinecap="butt"
      />
    </svg>
  );
}

function Driveway({ side }: { side: "left" | "right" }) {
  return (
    <span aria-hidden className={`absolute top-[1.125rem] h-3 w-[calc(100%+3px)] ${side === "left" ? "left-0" : "right-0"}`} style={{ background: ASPHALT }}>
      <span className="absolute inset-x-0 top-0 h-0.5 bg-white" />
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white" />
    </span>
  );
}

export function LearningPath({
  steps,
  startId,
  onStart,
  onSelect,
  onSetDone,
  done = EMPTY_DONE,
  runningId = null,
  heldId = null,
  colors = NAV2_PATH_COLORS,
  label = "Missionen",
  hrefOf,
  instant = false,
  armHeld = true,
  shape = "spine",
}: {
  steps: PathStep[];
  startId?: string;
  onStart?: (id: string) => void;
  onSelect?: (id: string) => void;
  onSetDone?: (id: string, done: boolean) => void;
  done?: Partial<Record<string, boolean>>;
  runningId?: string | null;
  heldId?: string | null;
  colors?: PathColors;
  label?: string;
  hrefOf?: (id: string) => string | undefined;
  instant?: boolean;
  armHeld?: boolean;
  shape?: "spine" | "serpentine";
}) {
  const admin = useDebugAdmin();
  const playable = steps.filter((step) => step.id !== startId);
  const runningIndex = runningId ? steps.findIndex((step) => step.id === runningId) : -1;
  const active = runningIndex >= 0;
  const heldIndex = heldId ? steps.findIndex((step) => step.id === heldId) : -1;
  const fromIndex = heldIndex >= 0 ? heldIndex : 0;
  const focus = active ? runningIndex : fromIndex;
  const [pose, setPose] = useState<Pose>({ x: 0, y: 0, heading: 90 });
  const [placed, setPlaced] = useState(false);
  const [glide, setGlide] = useState(false);
  const [track, setTrack] = useState<{ d: string; travel: number } | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const roadRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLElement | null)[]>([]);
  const phaseRef = useRef<Phase>("wait");
  const doneKey = playable.map((step) => (done[step.id] ? "1" : "0")).join("");
  const stepKey = `${doneKey}:${runningId ?? ""}:${heldId ?? ""}`;
  const [openKey, setOpenKey] = useState(stepKey);
  const [openId, setOpenId] = useState<string | null>(null);
  if (openKey !== stepKey) {
    setOpenKey(stepKey);
    setOpenId(null);
  }
  const placeRef = useRef<() => void>(() => {});
  placeRef.current = () => {
    const list = listRef.current;
    const index = phaseRef.current === "wait" ? fromIndex : focus;
    const node = nodeRefs.current[index];
    if (!list || !node) return;
    if (shape === "serpentine") {
      const centers = measureCenters(list, nodeRefs.current, steps.length);
      if (!centers) return;
      const d = serpentinePath(centers);
      setTrack({ d, travel: parkPercent(d, centers, index, phaseRef.current === "dock") });
      setPlaced(true);
      return;
    }
    const road = roadRef.current;
    if (!road) return;
    setPose(measurePose(list, road, node, phaseRef.current === "dock", index));
    setPlaced(true);
  };

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active || reduced) {
      phaseRef.current = active ? "dock" : "wait";
      placeRef.current();
      return;
    }
    phaseRef.current = "along";
    placeRef.current();
    const id = window.setTimeout(() => {
      phaseRef.current = "dock";
      placeRef.current();
    }, 720);
    return () => window.clearTimeout(id);
  }, [active, fromIndex, focus, shape, steps.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => placeRef.current());
    observer.observe(list);
    const frame = window.requestAnimationFrame(() => setGlide(true));
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const targetCandidate = runningId ?? heldId ?? openId ?? playable.find((step) => !done[step.id])?.id ?? null;
  const adminTarget = playable.some((step) => step.id === targetCandidate) ? targetCandidate : null;
  const nextChapterId = playable.find((step) => !done[step.id])?.id ?? playable[playable.length - 1]?.id ?? null;

  const serpentine = shape === "serpentine";

  return (
    <nav aria-label={label} className={serpentine ? "w-full max-w-sm" : "w-fit"}>
      <ol ref={listRef} className={`relative flex flex-col pt-3 pb-2 ${serpentine ? "gap-7" : "gap-5"}`}>
        {serpentine ? (
          <SerpentineRoad d={track?.d ?? ""} />
        ) : (
          <div
            ref={roadRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-10 -translate-x-1/2 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{ background: ASPHALT }}
          >
            <span className="absolute inset-y-2 left-1 w-0.5 rounded-full bg-white" />
            <span className="absolute inset-y-2 right-1 w-0.5 rounded-full bg-white" />
            <span
              className="absolute inset-y-3 left-1/2 w-1 -translate-x-1/2"
              style={{
                backgroundImage: "repeating-linear-gradient(to bottom, #fff 0 12px, transparent 12px 24px)",
              }}
            />
          </div>
        )}
        {steps.map((item, index) => {
          const passed = startId !== undefined && item.id === startId;
          const playableId = passed ? null : item.id;
          const isDone = playableId ? Boolean(done[playableId]) : false;
          const live = runningId === item.id;
          const held = heldId === item.id;
          const armed = Boolean(playableId) && !live && (openId === playableId || (armHeld && held));
          const href = playableId ? hrefOf?.(playableId) : undefined;
          const side = index % 2 === 0 ? "left" : "right";
          const open = () => {
            if (!playableId) return;
            if (isDone || live || armed) {
              onStart?.(playableId);
              return;
            }
            setOpenId(playableId);
            onSelect?.(playableId);
          };
          const start = () => {
            if (playableId) onStart?.(playableId);
          };
          const stepColors = item.colors ?? colors;
          const chapterMark = item.id === nextChapterId ? "next-chapter" : undefined;
          return (
            <li
              key={item.id}
              className={
                serpentine
                  ? "relative z-10 grid grid-cols-[3rem_1fr_3rem]"
                  : "relative z-10 grid grid-cols-[3rem_1.5rem_2.5rem_1.5rem_3rem]"
              }
            >
              <div className="flex flex-col items-end" data-tour={side === "left" ? chapterMark : undefined}>
                {side === "left" ? (
                  <NodeButton
                    item={item}
                    done={isDone}
                    passed={passed}
                    live={live}
                    held={held}
                    armed={armed}
                    colors={stepColors}
                    href={href}
                    instant={instant}
                    nodeRef={(el) => {
                      nodeRefs.current[index] = el;
                    }}
                    onClick={open}
                    onStart={start}
                  />
                ) : null}
              </div>
              {serpentine ? (
                <div />
              ) : (
                <>
                  <div className="relative">{side === "left" ? <Driveway side="left" /> : null}</div>
                  <div />
                  <div className="relative">{side === "right" ? <Driveway side="right" /> : null}</div>
                </>
              )}
              <div className="flex flex-col items-start" data-tour={side === "right" ? chapterMark : undefined}>
                {side === "right" ? (
                  <NodeButton
                    item={item}
                    done={isDone}
                    passed={passed}
                    live={live}
                    held={held}
                    armed={armed}
                    colors={stepColors}
                    href={href}
                    instant={instant}
                    nodeRef={(el) => {
                      nodeRefs.current[index] = el;
                    }}
                    onClick={open}
                    onStart={start}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
        <div
          aria-hidden
          className={`pointer-events-none absolute z-20 size-8 drop-shadow-sm ${placed ? "opacity-100" : "opacity-0"} ${
            serpentine
              ? glide
                ? "transition-[offset-distance] duration-1000 ease-in-out motion-reduce:transition-none"
                : ""
              : glide
                ? "top-0 left-0 transition-[left,top,transform] duration-700 ease-in-out motion-reduce:transition-none"
                : "top-0 left-0"
          }`}
          style={
            serpentine
              ? {
                  top: 0,
                  left: 0,
                  offsetPath: track ? `path('${track.d}')` : "none",
                  offsetDistance: `${track?.travel ?? 0}%`,
                  offsetRotate: "auto",
                  offsetAnchor: "center",
                }
              : {
                  left: pose.x,
                  top: pose.y,
                  transform: `translate(-50%, -50%) rotate(${pose.heading}deg)`,
                }
          }
        >
          <MiniTwin />
        </div>
      </ol>
      {admin && adminTarget ? (
        <div className="mt-5 flex flex-col items-start gap-2">
          {!done[adminTarget] ? (
            <button
              type="button"
              onClick={() => onSetDone?.(adminTarget, true)}
              className="rounded-full border border-dashed border-[#a67c12] px-3 py-1 text-xs font-medium text-[#6e4e08] hover:bg-[#f8e7b0]"
            >
              Mission erledigt
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSetDone?.(adminTarget, false)}
              className="rounded-full border border-dashed border-[#6b6456] px-3 py-1 text-xs font-medium text-[#4a453c] hover:bg-[#efe8d8]"
            >
              Mission zurück
            </button>
          )}
        </div>
      ) : null}
    </nav>
  );
}

function nodeCaption(item: PathStep) {
  return item.name ?? item.title;
}

function NodeButton({
  item,
  done,
  passed,
  live,
  held,
  armed,
  colors,
  href,
  instant,
  onClick,
  onStart,
  nodeRef,
}: {
  item: PathStep;
  done: boolean;
  passed: boolean;
  live: boolean;
  held: boolean;
  armed: boolean;
  colors: PathColors;
  href?: string;
  instant: boolean;
  onClick: () => void;
  onStart: () => void;
  nodeRef: (el: HTMLElement | null) => void;
}) {
  const caption = nodeCaption(item);
  const nodeStyle: CSSProperties = {};
  if (held && !live) {
    nodeStyle.boxShadow = `0 0 0 2px var(--background), 0 0 0 4px ${colors.fill}`;
  }
  if (!passed && live) {
    nodeStyle.background = colors.shade;
    nodeStyle.borderBottomColor = colors.liveEdge;
    nodeStyle.color = colors.liveInk;
  } else if (!passed && !done) {
    nodeStyle.background = colors.fill;
    nodeStyle.borderBottomColor = colors.shade;
    nodeStyle.color = colors.ink;
  }
  const nodeClass = `relative z-10 flex size-12 items-center justify-center rounded-full ${
    passed
      ? "border-2 border-dashed border-[#2f6b4f] bg-transparent text-[#2f6b4f]"
      : live
        ? "border-b-4"
        : done
          ? "border-b-4 border-b-[#1e4634] bg-[#2f6b4f] text-white"
          : "border-b-4"
  }`;
  const ariaLabel = passed
    ? `${caption}, geschafft`
    : done && !live
      ? `${caption}, nochmal starten`
      : held && !live
        ? `${caption}, ausgewählt`
        : caption;
  const icon = passed || (done && !live) ? <Check className="size-5" /> : <Play className="size-5" />;
  const asLink = Boolean(href) && !passed && (instant || armed || done);
  return (
    <>
      {asLink ? (
        <Link
          href={href!}
          ref={nodeRef}
          aria-current={live || held ? "step" : undefined}
          aria-label={ariaLabel}
          style={nodeStyle}
          className={nodeClass}
        >
          {icon}
        </Link>
      ) : (
        <button
          ref={nodeRef}
          type="button"
          disabled={passed}
          autoComplete="off"
          aria-current={live || held ? "step" : undefined}
          aria-expanded={!passed && !live ? armed : undefined}
          aria-label={ariaLabel}
          onClick={onClick}
          style={nodeStyle}
          className={nodeClass}
        >
          {icon}
        </button>
      )}
      <span className="mt-1.5 w-12 text-center text-[0.7rem] leading-4 font-medium text-heading">
        {item.title}
      </span>
      {armed ? (
        href ? (
          <Link
            href={href}
            className="mt-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
            style={{ background: colors.fill, color: colors.startInk }}
          >
            {done ? "Nochmal" : "Start"}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="mt-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
            style={{ background: colors.fill, color: colors.startInk }}
          >
            {done ? "Nochmal" : "Start"}
          </button>
        )
      ) : null}
    </>
  );
}

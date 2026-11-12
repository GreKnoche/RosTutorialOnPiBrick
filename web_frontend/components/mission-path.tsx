"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Lock, Play } from "lucide-react";
import { useDebugAdmin } from "@/lib/debug-admin";
import { PATH_STEPS } from "@/lib/nav2-lessons";

type Step = {
  id: string;
  title: string;
};

type Phase = "wait" | "along" | "dock";

type Pose = {
  x: number;
  y: number;
  heading: number;
};

const STEPS: Step[] = PATH_STEPS;

const ASPHALT = "#454c5a";

function measurePose(list: HTMLElement, road: HTMLElement, node: HTMLElement, dock: boolean, index: number): Pose {
  const listBox = list.getBoundingClientRect();
  const roadBox = road.getBoundingClientRect();
  const nodeBox = node.getBoundingClientRect();
  const y = nodeBox.top + nodeBox.height / 2 - listBox.top;
  const roadX = roadBox.left + roadBox.width / 2 - listBox.left;
  if (!dock) return { x: roadX, y, heading: 90 };
  const left = index % 2 === 0;
  const nose = 24;
  return {
    x: left ? nodeBox.right - listBox.left + nose : nodeBox.left - listBox.left - nose,
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

function Driveway({ side }: { side: "left" | "right" }) {
  return (
    <span aria-hidden className={`absolute top-[1.125rem] h-3 w-[calc(100%+3px)] ${side === "left" ? "left-0" : "right-0"}`} style={{ background: ASPHALT }}>
      <span className="absolute inset-x-0 top-0 h-0.5 bg-white" />
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white" />
    </span>
  );
}

export function MissionPath({
  onStart,
  onSelect,
  onComplete,
  onBack,
  active = false,
  done = 1,
  runningId = null,
  heldId = null,
}: {
  onStart?: (id: string) => void;
  onSelect?: (id: string) => void;
  onComplete?: (done: number) => void;
  onBack?: (done: number) => void;
  active?: boolean;
  done?: number;
  runningId?: string | null;
  heldId?: string | null;
}) {
  const admin = useDebugAdmin();
  const current = Math.min(done, STEPS.length - 1);
  const fromIndex = Math.max(0, done - 1);
  const runningIndex = runningId ? STEPS.findIndex((step) => step.id === runningId) : -1;
  const focus = runningIndex >= 0 ? runningIndex : current;
  const [pose, setPose] = useState<Pose>({ x: 0, y: 0, heading: 90 });
  const [placed, setPlaced] = useState(false);
  const [glide, setGlide] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const roadRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const phaseRef = useRef<Phase>("wait");
  const stepKey = `${done}:${active}:${runningId ?? ""}`;
  const [openKey, setOpenKey] = useState(stepKey);
  const [openId, setOpenId] = useState<string | null>(null);
  if (openKey !== stepKey) {
    setOpenKey(stepKey);
    setOpenId(null);
  }
  const placeRef = useRef<() => void>(() => {});
  placeRef.current = () => {
    const list = listRef.current;
    const road = roadRef.current;
    const index = phaseRef.current === "wait" ? fromIndex : focus;
    const node = nodeRefs.current[index];
    if (!list || !road || !node) return;
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
  }, [active, current, fromIndex, focus]);

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

  return (
    <nav aria-label="Missionen" className="w-fit">
      <ol ref={listRef} className="relative flex flex-col gap-5 pt-3 pb-2">
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
        {STEPS.map((item, index) => {
          const state = index < done ? "done" : index === current ? "current" : "locked";
          const passed = item.id === "start";
          const side = index % 2 === 0 ? "left" : "right";
          const open = () => {
            if (state === "locked" || passed) return;
            if (state === "done") {
              onStart?.(item.id);
              return;
            }
            if (active) return;
            setOpenId(item.id);
            onSelect?.(item.id);
          };
          return (
            <li key={item.id} className="relative z-10 grid grid-cols-[3rem_1.5rem_2.5rem_1.5rem_3rem]">
              <div className="flex flex-col items-end">
                {side === "left" ? (
                  <NodeButton
                    item={item}
                    state={state}
                    passed={passed}
                    live={runningId === item.id}
                    held={heldId === item.id}
                    armed={openId === item.id || (heldId === item.id && runningId !== item.id)}
                    buttonRef={(el) => {
                      nodeRefs.current[index] = el;
                    }}
                    onClick={open}
                    onStart={() => onStart?.(item.id)}
                  />
                ) : null}
              </div>
              <div className="relative">{side === "left" ? <Driveway side="left" /> : null}</div>
              <div />
              <div className="relative">{side === "right" ? <Driveway side="right" /> : null}</div>
              <div className="flex flex-col items-start">
                {side === "right" ? (
                  <NodeButton
                    item={item}
                    state={state}
                    passed={passed}
                    live={runningId === item.id}
                    held={heldId === item.id}
                    armed={openId === item.id || (heldId === item.id && runningId !== item.id)}
                    buttonRef={(el) => {
                      nodeRefs.current[index] = el;
                    }}
                    onClick={open}
                    onStart={() => onStart?.(item.id)}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
        <div
          aria-hidden
          className={`pointer-events-none absolute top-0 left-0 z-20 size-8 drop-shadow-sm ${placed ? "opacity-100" : "opacity-0"} ${
            glide ? "transition-[left,top,transform] duration-700 ease-in-out motion-reduce:transition-none" : ""
          }`}
          style={{
            left: pose.x,
            top: pose.y,
            transform: `translate(-50%, -50%) rotate(${pose.heading}deg)`,
          }}
        >
          <MiniTwin />
        </div>
      </ol>
      {admin && (done < STEPS.length || done > 1) ? (
        <div className="mt-5 flex flex-col items-start gap-2">
          {done < STEPS.length ? (
            <button
              type="button"
              onClick={() => onComplete?.(Math.min(done + 1, STEPS.length))}
              className="rounded-full border border-dashed border-[#a67c12] px-3 py-1 text-xs font-medium text-[#6e4e08] hover:bg-[#f8e7b0]"
            >
              Mission erledigt
            </button>
          ) : null}
          {done > 1 ? (
            <button
              type="button"
              onClick={() => onBack?.(Math.max(1, done - 1))}
              className="rounded-full border border-dashed border-[#6b6456] px-3 py-1 text-xs font-medium text-[#4a453c] hover:bg-[#efe8d8]"
            >
              Mission zurück
            </button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}

function NodeButton({
  item,
  state,
  passed,
  live,
  held,
  armed,
  onClick,
  onStart,
  buttonRef,
}: {
  item: Step;
  state: "done" | "current" | "locked";
  passed: boolean;
  live: boolean;
  held: boolean;
  armed: boolean;
  onClick: () => void;
  onStart: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={state === "locked" || passed}
        autoComplete="off"
        aria-current={state === "current" ? "step" : undefined}
        aria-expanded={state !== "locked" && !passed && !live ? armed : undefined}
        aria-label={
          passed
            ? `${item.title}, geschafft`
            : state === "done" && !live
              ? `${item.title}, nochmal starten`
              : held && !live
                ? `${item.title}, ausgewählt`
                : state === "locked"
                  ? `${item.title}, zu`
                  : item.title
        }
        onClick={onClick}
        className={`relative z-10 flex size-12 items-center justify-center rounded-full ${
          held && !live ? "ring-2 ring-[#e6b325] ring-offset-2 ring-offset-background " : ""
        }${
          passed
            ? "border-2 border-dashed border-[#2f6b4f] bg-transparent text-[#2f6b4f]"
            : live
              ? "border-b-4 border-b-[#6e4e08] bg-[#a67c12] text-[#2a1c08]"
              : state === "done"
                ? "border-b-4 border-b-[#1e4634] bg-[#2f6b4f] text-white"
                : state === "current"
                  ? "border-b-4 border-b-[#a67c12] bg-[#e6b325] text-[#3c3214]"
                  : "cursor-not-allowed border-b-4 border-b-[#c6c6c4] bg-[#e4e4e2] text-[#8a877c]"
        }`}
      >
        {passed || (state === "done" && !live) ? (
          <Check className="size-5" />
        ) : state === "locked" ? (
          <Lock className="size-4" />
        ) : (
          <Play className="size-5" />
        )}
      </button>
      <span
        className={`mt-1.5 w-12 text-center text-[0.7rem] leading-4 font-medium ${
          state === "locked" ? "text-[#8a877c]" : "text-heading"
        }`}
      >
        {item.title}
      </span>
      {armed ? (
        <button
          type="button"
          onClick={onStart}
          className="mt-1 rounded-full bg-[#e6b325] px-2 py-0.5 text-[0.7rem] font-semibold text-[#1c1404]"
        >
          {state === "done" ? "Nochmal" : "Start"}
        </button>
      ) : null}
    </>
  );
}

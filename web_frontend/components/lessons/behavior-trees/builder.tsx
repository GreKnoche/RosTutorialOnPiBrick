"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  CAR,
  type Course,
  type DemoFrame,
  type Status,
} from "@/lib/bt-demo";
import {
  insertNode,
  paletteFor,
  relocate,
  removeNode,
  treeXml,
  type PaletteKind,
  type StudentNode,
} from "@/lib/bt-missions";

const MIME = "application/x-bt-node";

const LABEL: Record<PaletteKind, string> = {
  sequence: "Sequence",
  fallback: "Fallback",
  compute: "ComputePath",
  follow: "FollowPath",
  backup: "BackUp",
  drive: "Drive",
};

const MARK: Partial<Record<PaletteKind, string>> = {
  sequence: "→",
  fallback: "?",
};

const INK: Record<Status, { fill: string; stroke: string; text: string }> = {
  idle: { fill: "#2a2926", stroke: "#6b675c", text: "#d6d3c8" },
  running: { fill: "#5c4814", stroke: "#f0c84a", text: "#fff6d0" },
  success: { fill: "#163226", stroke: "#3dbe6e", text: "#d8f5e3" },
  failure: { fill: "#3a2220", stroke: "#d1614f", text: "#f3d2cc" },
};

type DragPayload = { source: "palette"; kind: PaletteKind } | { source: "node"; id: string };

const SCALE = 100;

function wx(x: number) {
  return x * SCALE;
}

function wy(fieldHeight: number, y: number) {
  return (fieldHeight - y) * SCALE;
}

export function BtBuilder({
  missionId,
  course,
  tree,
  frame,
  disabled,
  onChange,
}: {
  missionId: string | null;
  course: Course;
  tree: StudentNode | null;
  frame: DemoFrame;
  disabled: boolean;
  onChange: (next: StudentNode | null) => void;
}) {
  const drag = useRef<DragPayload | null>(null);
  const dropped = useRef(false);
  const [over, setOver] = useState<string | null>(null);
  const palette = paletteFor(missionId);
  const xml = treeXml(tree);

  function take(payload: DragPayload) {
    drag.current = payload;
    dropped.current = false;
  }

  function place(parentId: string | null, index: number) {
    const payload = drag.current;
    if (!payload || disabled) return;
    dropped.current = true;
    if (payload.source === "palette") {
      onChange(insertNode(tree, parentId, index, fresh(payload.kind)));
      return;
    }
    onChange(relocate(tree, payload.id, parentId, index));
  }

  function finishDrag() {
    drag.current = null;
    setOver(null);
  }

  return (
    <div className={`grid gap-px bg-border lg:grid-cols-[16rem_minmax(0,1fr)] ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <div className="flex flex-col gap-3 bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Knoten</p>
        <ul className="flex flex-col gap-2">
          {palette.map((kind) => (
            <li key={kind}>
              <div
                role="button"
                aria-label={LABEL[kind]}
                tabIndex={0}
                draggable
                onDragStart={(event) => {
                  take({ source: "palette", kind });
                  event.dataTransfer.setData(MIME, kind);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onDragEnd={finishDrag}
                className="flex cursor-grab items-center gap-2 rounded-lg bg-[#2a2926] px-3 py-2 text-sm text-[#d6d3c8] ring-1 ring-[#6b675c] active:cursor-grabbing"
              >
                {MARK[kind] ? (
                  <span className="w-4 text-center font-mono text-[#f0c84a]">{MARK[kind]}</span>
                ) : (
                  <span className="w-4" />
                )}
                <span>{LABEL[kind]}</span>
              </div>
            </li>
          ))}
        </ul>
        <div
          onDragOver={(event) => {
            if (drag.current?.source !== "node") return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOver("remove");
          }}
          onDragLeave={() => setOver((current) => (current === "remove" ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            const payload = drag.current;
            dropped.current = true;
            setOver(null);
            if (payload?.source === "node") onChange(removeNode(tree, payload.id));
          }}
          className={`mt-auto rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground ${
            over === "remove" ? "border-[#d1614f] text-[#d1614f]" : "border-foreground/20"
          }`}
        >
          Zum Entfernen hier ablegen
        </div>
      </div>
      <div className="flex flex-col gap-3 bg-[#12110e] p-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8a8678]">Baum</p>
        {tree ? (
          <Branch
            node={tree}
            course={course}
            frame={frame}
            over={over}
            setOver={setOver}
            onPlace={place}
            onRemove={(id) => onChange(removeNode(tree, id))}
            onDragStart={(id) => take({ source: "node", id })}
            onDragEnd={finishDrag}
          />
        ) : (
          <Slot
            slotId="root"
            over={over}
            setOver={setOver}
            onPlace={() => place(null, 0)}
            label="Wurzel"
          />
        )}
        <pre className="overflow-x-auto rounded-lg bg-[#1c1b17] p-3 font-mono text-[11px] leading-5 text-[#d6d3c8]">
          {xml || "<!-- Sequence, Fallback, ComputePathToPose, FollowPath, BackUp -->"}
        </pre>
      </div>
    </div>
  );
}

function Branch({
  node,
  course,
  frame,
  over,
  setOver,
  onPlace,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  node: StudentNode;
  course: Course;
  frame: DemoFrame;
  over: string | null;
  setOver: Dispatch<SetStateAction<string | null>>;
  onPlace: (parentId: string | null, index: number) => void;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const control = node.kind === "sequence" || node.kind === "fallback";
  const runningId = frame.runningId;
  const own = frame.status[node.id] ?? "idle";
  const active = own === "running" || runningId === node.id || Boolean(runningId?.startsWith(`${node.id}-`));
  const ink = INK[active ? "running" : own];
  const badge = goalBadge(node, course);
  const dim = runningId !== null && !active && own === "idle";

  return (
    <div className="flex flex-col items-start gap-2" style={{ opacity: dim ? 0.45 : 1 }}>
      <div
        role="button"
        aria-label={LABEL[node.kind]}
        tabIndex={0}
        draggable
        onDragStart={(event) => {
          onDragStart(node.id);
          event.dataTransfer.setData(MIME, node.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={onDragEnd}
        className="flex cursor-grab items-center gap-2 rounded-lg px-3 py-2 text-sm active:cursor-grabbing"
        style={{ background: ink.fill, color: ink.text, boxShadow: `inset 0 0 0 1.5px ${ink.stroke}` }}
      >
        {MARK[node.kind] ? <span className="font-mono text-[#f0c84a]">{MARK[node.kind]}</span> : null}
        <span>
          {LABEL[node.kind]}
          {badge}
        </span>
        {active ? <span className="font-mono text-[11px] text-[#f0c84a]">running</span> : null}
        <button
          type="button"
          aria-label={`${LABEL[node.kind]} entfernen`}
          draggable={false}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => onRemove(node.id)}
          className="ml-1 text-[#8a8678] hover:text-[#d6d3c8]"
        >
          ×
        </button>
      </div>
      {control ? (
        <div className="ml-3 flex flex-wrap items-start gap-2 border-l border-[#6b675c] pl-3">
          {node.children.map((child, index) => (
            <div key={child.id} className="flex items-start gap-2">
              <Slot
                slotId={`${node.id}:${index}`}
                over={over}
                setOver={setOver}
                onPlace={() => onPlace(node.id, index)}
              />
              <Branch
                node={child}
                course={course}
                frame={frame}
                over={over}
                setOver={setOver}
                onPlace={onPlace}
                onRemove={onRemove}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </div>
          ))}
          <Slot
            slotId={`${node.id}:end`}
            over={over}
            setOver={setOver}
            onPlace={() => onPlace(node.id, node.children.length)}
            label="+"
          />
        </div>
      ) : null}
    </div>
  );
}

function Slot({
  slotId,
  over,
  setOver,
  onPlace,
  label,
}: {
  slotId: string;
  over: string | null;
  setOver: Dispatch<SetStateAction<string | null>>;
  onPlace: () => void;
  label?: string;
}) {
  const hot = over === slotId;
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(slotId);
      }}
      onDragLeave={() => setOver((current) => (current === slotId ? null : current))}
      onDrop={(event) => {
        event.preventDefault();
        setOver(null);
        onPlace();
      }}
      role="button"
      aria-label={label === "+" ? "Kind anhängen" : label === "Wurzel" ? "Wurzel" : "Slot"}
      className={`flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-dashed px-2 text-xs ${
        hot ? "border-[#f0c84a] text-[#f0c84a]" : "border-[#6b675c] text-[#8a8678]"
      } ${label === "Wurzel" ? "w-full py-8" : ""}`}
    >
      {label ?? ""}
    </div>
  );
}

function goalBadge(node: StudentNode, course: Course) {
  if (node.kind !== "drive" || !node.goal || course.goals.length < 2) return "";
  const index = course.goals.findIndex(
    (goal) => Math.hypot(goal.x - (node.goal?.x ?? 0), goal.y - (node.goal?.y ?? 0)) < 0.05,
  );
  return index >= 0 ? ` ${String.fromCharCode(65 + index)}` : "";
}

function fresh(kind: PaletteKind): StudentNode {
  const id = `n${Math.random().toString(36).slice(2, 8)}`;
  return { id, kind, children: [] };
}

export function MissionCourse({ frame }: { frame: DemoFrame }) {
  const { course, pose, trail, path, pathValid, goalsReached } = frame.world;
  const { field } = course;
  const degrees = (-pose.theta * 180) / Math.PI;
  return (
    <div className="bg-[#12110e] p-3 sm:p-4">
      <svg
        viewBox={`0 0 ${field.width * SCALE} ${field.height * SCALE}`}
        role="img"
        aria-label="Kurs mit Auto und Zielen"
        className="block h-auto w-full"
      >
        <rect width={field.width * SCALE} height={field.height * SCALE} fill="#12110e" />
        {course.obstacles.map((block) => (
          <g key={`${block.x}-${block.y}`}>
            <rect
              x={wx(block.x)}
              y={wy(field.height, block.y + block.h)}
              width={block.w * SCALE}
              height={block.h * SCALE}
              rx="8"
              fill="#3c3b38"
            />
            <text
              x={wx(block.x + block.w / 2)}
              y={wy(field.height, block.y + block.h / 2) + 4}
              textAnchor="middle"
              fill="#d6d3c8"
              fontSize="13"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              Obstacle
            </text>
          </g>
        ))}
        {course.goals.map((goal, index) => {
          const reached = index < goalsReached || Math.hypot(pose.x - goal.x, pose.y - goal.y) < CAR.goalRadius;
          const name = course.goals.length > 1 ? String.fromCharCode(65 + index) : "Goal";
          return (
            <g key={`${goal.x}-${goal.y}`}>
              <circle
                cx={wx(goal.x)}
                cy={wy(field.height, goal.y)}
                r={CAR.goalRadius * SCALE}
                fill={reached ? "#3dbe6e33" : "none"}
                stroke={reached ? "#3dbe6e" : "#e6b325"}
                strokeWidth="2"
                strokeDasharray={reached ? undefined : "7 6"}
              />
              <text
                x={wx(goal.x)}
                y={wy(field.height, goal.y) - CAR.goalRadius * SCALE - 8}
                textAnchor="middle"
                fill="#e6b325"
                fontSize="14"
                fontFamily="Arial, Helvetica, sans-serif"
              >
                {name}
              </text>
            </g>
          );
        })}
        {path && path.length > 1 ? (
          <polyline
            points={path.map((point) => `${wx(point.x)},${wy(field.height, point.y)}`).join(" ")}
            fill="none"
            stroke={pathValid ? "#e6b325" : "#d1614f"}
            strokeWidth="2.5"
            strokeDasharray="7 6"
          />
        ) : null}
        <polyline
          points={trail.map((point) => `${wx(point.x)},${wy(field.height, point.y)}`).join(" ")}
          fill="none"
          stroke="#e6b325"
          strokeWidth="2"
          opacity="0.7"
        />
        <g transform={`translate(${wx(pose.x)} ${wy(field.height, pose.y)}) rotate(${degrees})`}>
          <TwinCar />
        </g>
      </svg>
    </div>
  );
}

function TwinCar() {
  const length = CAR.length * SCALE;
  const width = CAR.width * SCALE;
  const wheel = width * 0.42;
  const tire = wheel * 0.7;
  return (
    <>
      <rect x={-length / 2} y={-width / 2} width={length} height={width} rx="6" fill="#e11d2e" stroke="#fff7ed" strokeWidth="2" />
      <rect x={-wheel} y={-width / 2 - tire} width={wheel * 2} height={tire} fill="#111318" stroke="#fff7ed" strokeWidth="2.2" />
      <rect x={-wheel} y={width / 2} width={wheel * 2} height={tire} fill="#111318" stroke="#fff7ed" strokeWidth="2.2" />
      <polygon
        points={`${length / 2 + 7},0 ${length / 2 - length * 0.22},${-width * 0.28} ${length / 2 - length * 0.22},${width * 0.28}`}
        fill="#fff7ed"
      />
    </>
  );
}

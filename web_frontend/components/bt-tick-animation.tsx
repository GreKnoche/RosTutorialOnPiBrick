"use client";

import type { ReactNode } from "react";

type Point = { t: number; x: number; y: number };
type Stroke = { values: string; times: string };
type NoteFrame = { text: string; color: string; from: number; to: number };

const IDLE = "#94a3b8";
const RUN = "#38bdf8";
const OK = "#4ade80";
const FAIL = "#fb7185";
const WAIT = "#fbbf24";
const INK = "#ffffff";
const FILL = "#7b8da3";

const ROOT = { x: 110, y: 28 };
const LEFT = { x: 52, y: 48 };
const RIGHT = { x: 168, y: 48 };

const PIPE_ROOT = { x: 110, y: 26 };
const PIPE_A = { x: 40, y: 50 };
const PIPE_B = { x: 110, y: 50 };
const PIPE_C = { x: 180, y: 50 };

function Tick({ points, dur, still }: { points: Point[]; dur: string; still: Point }) {
  const times = points.map((point) => point.t).join(";");
  return (
    <>
      <circle className="bt-tick-move" r={3.5} fill="#facc15" cx={points[0].x} cy={points[0].y}>
        <animate attributeName="cx" values={points.map((point) => point.x).join(";")} keyTimes={times} dur={dur} repeatCount="indefinite" />
        <animate attributeName="cy" values={points.map((point) => point.y).join(";")} keyTimes={times} dur={dur} repeatCount="indefinite" />
      </circle>
      <circle className="bt-tick-still" r={3.5} fill="#facc15" cx={still.x} cy={still.y} />
    </>
  );
}

function Box({
  x,
  y,
  w,
  h,
  label,
  size,
  dur,
  stroke,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  size: number;
  dur?: string;
  stroke?: Stroke;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={FILL} stroke={IDLE} strokeWidth={1.5}>
        {dur && stroke ? (
          <animate attributeName="stroke" values={stroke.values} keyTimes={stroke.times} dur={dur} repeatCount="indefinite" />
        ) : null}
      </rect>
      <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fill={INK} fontSize={size} fontWeight={600} fontFamily="ui-sans-serif, system-ui">
        {label}
      </text>
    </g>
  );
}

/** Opacity keyframes: visible from `from` until `to` (discrete steps). */
function opacityKeys(from: number, to: number): Stroke {
  if (from <= 0 && to >= 1) return { values: "1;1", times: "0;1" };
  if (from <= 0) return { values: "1;0", times: `0;${to}` };
  if (to >= 1) return { values: "0;1", times: `0;${from}` };
  return { values: "0;1;0", times: `0;${from};${to}` };
}

function Note({ x, dur, frames }: { x: number; dur: string; frames: NoteFrame[] }) {
  return (
    <g>
      {frames.map((frame) => {
        const opacity = opacityKeys(frame.from, frame.to);
        return (
          <text
            key={`${frame.text}-${frame.from}`}
            x={x}
            y={91}
            textAnchor="middle"
            fill={frame.color}
            fontSize={10}
            fontWeight={700}
            fontFamily="ui-sans-serif, system-ui"
            opacity={frame.from <= 0 ? 1 : 0}
          >
            {frame.text}
            <animate
              attributeName="opacity"
              values={opacity.values}
              keyTimes={opacity.times}
              calcMode="discrete"
              dur={dur}
              repeatCount="indefinite"
            />
          </text>
        );
      })}
    </g>
  );
}

function Pair({
  title,
  left,
  right,
  dur,
  points,
  still,
  /** Second tick path — e.g. Parallel ticks both children at once. */
  pointsB,
  stillB,
  leftStroke,
  rightStroke,
  leftNotes,
  rightNotes,
}: {
  title: string;
  left: string;
  right: string;
  dur: string;
  points: Point[];
  still: Point;
  pointsB?: Point[];
  stillB?: Point;
  leftStroke: Stroke;
  rightStroke?: Stroke;
  leftNotes: NoteFrame[];
  rightNotes: NoteFrame[];
}) {
  return (
    <svg viewBox="0 0 220 100" className="mx-auto block h-24 w-auto max-w-full" role="img" aria-label={title}>
      <line x1={ROOT.x} y1={24} x2={LEFT.x} y2={46} stroke="#cbd5e1" strokeWidth={1.5} />
      <line x1={ROOT.x} y1={24} x2={RIGHT.x} y2={46} stroke="#cbd5e1" strokeWidth={1.5} />
      <Box x={16} y={2} w={188} h={22} label={title} size={9} />
      <Box x={4} y={46} w={96} h={20} label={left} size={8} dur={dur} stroke={leftStroke} />
      <Box x={120} y={46} w={96} h={20} label={right} size={8} dur={dur} stroke={rightStroke} />
      <Tick points={points} dur={dur} still={still} />
      {pointsB && stillB ? <Tick points={pointsB} dur={dur} still={stillB} /> : null}
      <Note x={LEFT.x} dur={dur} frames={leftNotes} />
      <Note x={RIGHT.x} dur={dur} frames={rightNotes} />
    </svg>
  );
}

const DEC_ABOVE = { x: 110, y: 14 };
const DEC_ROOT = { x: 110, y: 40 };
const DEC_CHILD = { x: 110, y: 68 };

/** Unspecified parent → RateController → PathClear. Ticks arrive from above. */
function Decorator({
  title,
  child,
  dur,
  inbound,
  inboundStill,
  pass,
  passStill,
  parentStroke,
  childStroke,
  parentNotes,
  childNotes,
}: {
  title: string;
  child: string;
  dur: string;
  /** Frequent ticks along the edge into the decorator. */
  inbound: Point[];
  inboundStill: Point;
  /** Sparse ticks the decorator forwards to the child. */
  pass: Point[];
  passStill: Point;
  parentStroke: Stroke;
  childStroke: Stroke;
  parentNotes: NoteFrame[];
  childNotes: NoteFrame[];
}) {
  return (
    <svg viewBox="0 0 220 100" className="mx-auto block h-24 w-auto max-w-full" role="img" aria-label={title}>
      <line x1={DEC_ABOVE.x} y1={16} x2={DEC_ROOT.x} y2={32} stroke="#cbd5e1" strokeWidth={1.5} />
      <line x1={DEC_ROOT.x} y1={48} x2={DEC_CHILD.x} y2={62} stroke="#cbd5e1" strokeWidth={1.5} />
      <Box x={70} y={2} w={80} h={16} label="…" size={10} />
      <Box x={30} y={30} w={160} h={18} label={title} size={8} dur={dur} stroke={parentStroke} />
      <Box x={50} y={62} w={120} h={18} label={child} size={8} dur={dur} stroke={childStroke} />
      <Tick points={inbound} dur={dur} still={inboundStill} />
      <Tick points={pass} dur={dur} still={passStill} />
      <Note x={72} dur={dur} frames={parentNotes} />
      <Note x={148} dur={dur} frames={childNotes} />
    </svg>
  );
}

function Triple({
  title,
  a,
  b,
  c,
  dur,
  points,
  still,
  aStroke,
  bStroke,
  cStroke,
  aNotes,
  bNotes,
  cNotes,
}: {
  title: string;
  a: string;
  b: string;
  c: string;
  dur: string;
  points: Point[];
  still: Point;
  aStroke: Stroke;
  bStroke: Stroke;
  cStroke: Stroke;
  aNotes: NoteFrame[];
  bNotes: NoteFrame[];
  cNotes: NoteFrame[];
}) {
  return (
    <svg viewBox="0 0 220 100" className="mx-auto block h-24 w-auto max-w-full" role="img" aria-label={title}>
      <line x1={PIPE_ROOT.x} y1={22} x2={PIPE_A.x} y2={48} stroke="#cbd5e1" strokeWidth={1.5} />
      <line x1={PIPE_ROOT.x} y1={22} x2={PIPE_B.x} y2={48} stroke="#cbd5e1" strokeWidth={1.5} />
      <line x1={PIPE_ROOT.x} y1={22} x2={PIPE_C.x} y2={48} stroke="#cbd5e1" strokeWidth={1.5} />
      <Box x={16} y={2} w={188} h={20} label={title} size={9} />
      <Box x={4} y={48} w={68} h={20} label={a} size={7.5} dur={dur} stroke={aStroke} />
      <Box x={76} y={48} w={68} h={20} label={b} size={7.5} dur={dur} stroke={bStroke} />
      <Box x={148} y={48} w={68} h={20} label={c} size={7.5} dur={dur} stroke={cStroke} />
      <Tick points={points} dur={dur} still={still} />
      <Note x={PIPE_A.x} dur={dur} frames={aNotes} />
      <Note x={PIPE_B.x} dur={dur} frames={bNotes} />
      <Note x={PIPE_C.x} dur={dur} frames={cNotes} />
    </svg>
  );
}

function Example({ name, attrs, children }: { name: string; attrs?: [string, string][]; children: string[] }) {
  return (
    <pre className="m-0 overflow-auto rounded-md border border-border bg-[#1c1404] px-2 py-1.5 font-mono text-[0.58rem] leading-[1.4] whitespace-pre text-[#f4efe4]">
      <span className="text-[#ffe14a]">{`<${name}`}</span>
      {attrs?.map(([key, value]) => (
        <span key={key}>
          {" "}
          <span className="text-[#c9b896]">{key}</span>
          <span className="text-[#ffe14a]">=</span>
          <span className="text-[#f0b48a]">{`"${value}"`}</span>
        </span>
      ))}
      <span className="text-[#ffe14a]">{">\n"}</span>
      {children.map((child) => (
        <span key={child} className="text-[#ffe14a]">{`  <${child}/>\n`}</span>
      ))}
      <span className="text-[#ffe14a]">{`</${name}>`}</span>
    </pre>
  );
}

function Card({ animation, example }: { animation: ReactNode; example: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 bg-[#334155] px-1.5 py-1.5">
      {animation}
      {example}
    </div>
  );
}

function StrukturCards() {
  return (
    <>
        <Card
          animation={
            <Pair
              title="Sequence"
              left="Kind 1"
              right="Kind 2"
              dur="6s"
              still={{ t: 1, ...RIGHT }}
              points={[
                { t: 0, ...ROOT },
                { t: 0.06, ...ROOT },
                { t: 0.2, ...LEFT },
                { t: 0.34, ...LEFT },
                { t: 0.42, ...RIGHT },
                { t: 0.62, ...RIGHT },
                { t: 0.78, ...RIGHT },
                { t: 1, ...RIGHT },
              ]}
              leftStroke={{
                values: `${IDLE};${RUN};${OK};${OK}`,
                times: "0;0.1;0.36;1",
              }}
              rightStroke={{
                values: `${IDLE};${IDLE};${RUN};${OK};${OK}`,
                times: "0;0.38;0.48;0.78;1",
              }}
              leftNotes={[
                { text: "RUNNING", color: RUN, from: 0.08, to: 0.36 },
                { text: "SUCCESS", color: OK, from: 0.36, to: 1 },
              ]}
              rightNotes={[
                { text: "wartet", color: WAIT, from: 0, to: 0.4 },
                { text: "RUNNING", color: RUN, from: 0.4, to: 0.76 },
                { text: "SUCCESS", color: OK, from: 0.76, to: 1 },
              ]}
            />
          }
          example={<Example name="Sequence" attrs={[["name", "PlanAndFollow"]]} children={["Kind1", "Kind2"]} />}
        />
        <Card
          animation={
            <Pair
              title="Fallback"
              left="Kind 1"
              right="Kind 2"
              dur="8s"
              still={{ t: 1, ...RIGHT }}
              points={[
                // Phase 1: Kind1 SUCCESS
                { t: 0, ...ROOT },
                { t: 0.05, ...LEFT },
                { t: 0.16, ...LEFT },
                { t: 0.28, ...LEFT },
                // Phase 2: Kind1 FAILURE → Kind2 SUCCESS
                { t: 0.36, ...ROOT },
                { t: 0.42, ...LEFT },
                { t: 0.52, ...LEFT },
                { t: 0.6, ...RIGHT },
                { t: 0.74, ...RIGHT },
                { t: 0.88, ...RIGHT },
                { t: 1, ...RIGHT },
              ]}
              leftStroke={{
                values: `${IDLE};${RUN};${OK};${IDLE};${RUN};${FAIL};${FAIL}`,
                times: "0;0.06;0.18;0.34;0.44;0.54;1",
              }}
              rightStroke={{
                values: `${IDLE};${IDLE};${RUN};${OK};${OK}`,
                times: "0;0.56;0.64;0.84;1",
              }}
              leftNotes={[
                { text: "RUNNING", color: RUN, from: 0.05, to: 0.16 },
                { text: "SUCCESS", color: OK, from: 0.16, to: 0.34 },
                { text: "RUNNING", color: RUN, from: 0.4, to: 0.52 },
                { text: "FAILURE", color: FAIL, from: 0.52, to: 1 },
              ]}
              rightNotes={[
                { text: "wartet", color: WAIT, from: 0, to: 0.58 },
                { text: "RUNNING", color: RUN, from: 0.58, to: 0.82 },
                { text: "SUCCESS", color: OK, from: 0.82, to: 1 },
              ]}
            />
          }
          example={<Example name="Fallback" attrs={[["name", "TryNext"]]} children={["Kind1", "Kind2"]} />}
        />
        <Card
          animation={
            <Triple
              title="PipelineSequence"
              a="Kind 1"
              b="Kind 2"
              c="Kind 3"
              dur="7.5s"
              still={{ t: 1, ...PIPE_C }}
              points={[
                { t: 0, ...PIPE_ROOT },
                { t: 0.06, ...PIPE_A },
                { t: 0.2, ...PIPE_A },
                { t: 0.26, ...PIPE_A },
                { t: 0.32, ...PIPE_B },
                { t: 0.4, ...PIPE_A },
                { t: 0.46, ...PIPE_B },
                { t: 0.54, ...PIPE_A },
                { t: 0.6, ...PIPE_B },
                { t: 0.66, ...PIPE_C },
                { t: 0.74, ...PIPE_A },
                { t: 0.8, ...PIPE_B },
                { t: 0.86, ...PIPE_C },
                { t: 1, ...PIPE_C },
              ]}
              aStroke={{
                values: `${IDLE};${RUN};${OK};${RUN};${OK};${RUN};${OK};${RUN};${OK}`,
                times: "0;0.08;0.22;0.28;0.34;0.42;0.48;0.56;1",
              }}
              bStroke={{
                values: `${IDLE};${IDLE};${RUN};${OK};${RUN};${OK}`,
                times: "0;0.24;0.34;0.5;0.62;1",
              }}
              cStroke={{
                values: `${IDLE};${IDLE};${RUN};${RUN}`,
                times: "0;0.52;0.68;1",
              }}
              aNotes={[
                { text: "RUNNING", color: RUN, from: 0.05, to: 0.2 },
                { text: "1", color: OK, from: 0.2, to: 1 },
              ]}
              bNotes={[
                { text: "wartet", color: WAIT, from: 0, to: 0.28 },
                { text: "1+2", color: OK, from: 0.28, to: 1 },
              ]}
              cNotes={[
                { text: "wartet", color: WAIT, from: 0, to: 0.58 },
                { text: "1+2+3", color: RUN, from: 0.58, to: 1 },
              ]}
            />
          }
          example={
            <Example name="PipelineSequence" attrs={[["name", "NavigateWithReplanning"]]} children={["Kind1", "Kind2", "Kind3"]} />
          }
        />
        <Card
          animation={
            <Pair
              title="RecoveryNode"
              left="Hauptast"
              right="BackUp"
              dur="7s"
              still={{ t: 1, ...LEFT }}
              points={[
                { t: 0, ...ROOT },
                { t: 0.08, ...LEFT },
                { t: 0.22, ...LEFT },
                { t: 0.34, ...LEFT },
                { t: 0.46, ...RIGHT },
                { t: 0.6, ...RIGHT },
                { t: 0.72, ...LEFT },
                { t: 0.88, ...LEFT },
                { t: 1, ...LEFT },
              ]}
              leftStroke={{
                values: `${IDLE};${RUN};${FAIL};${IDLE};${RUN};${OK};${OK}`,
                times: "0;0.1;0.3;0.42;0.74;0.9;1",
              }}
              rightStroke={{
                values: `${IDLE};${IDLE};${RUN};${OK};${IDLE};${IDLE}`,
                times: "0;0.4;0.5;0.64;0.74;1",
              }}
              leftNotes={[
                { text: "RUNNING", color: RUN, from: 0.06, to: 0.28 },
                { text: "FAILURE", color: FAIL, from: 0.28, to: 0.7 },
                { text: "RUNNING", color: RUN, from: 0.7, to: 0.88 },
                { text: "SUCCESS", color: OK, from: 0.88, to: 1 },
              ]}
              rightNotes={[
                { text: "wartet", color: WAIT, from: 0, to: 0.42 },
                { text: "RUNNING", color: RUN, from: 0.42, to: 0.6 },
                { text: "SUCCESS", color: OK, from: 0.6, to: 0.74 },
                { text: "fertig", color: IDLE, from: 0.74, to: 1 },
              ]}
            />
          }
          example={
            <Example
              name="RecoveryNode"
              attrs={[
                ["number_of_retries", "1"],
                ["name", "NavigateRecovery"],
              ]}
              children={["Hauptast", "BackUp"]}
            />
          }
        />
    </>
  );
}

function MonitorCards() {
  return (
    <>
      <Card
        animation={
          <Pair
            title="Parallel"
            left="PathClear"
            right="FollowPath"
            dur="7s"
            still={{ t: 1, ...LEFT }}
            stillB={{ t: 1, ...RIGHT }}
            // Two ticks at once: Parallel visits both children every cycle.
            points={[
              { t: 0, ...ROOT },
              { t: 0.08, ...LEFT },
              { t: 0.28, ...LEFT },
              { t: 0.4, ...LEFT },
              { t: 0.55, ...LEFT },
              { t: 0.7, ...LEFT },
              { t: 0.85, ...ROOT },
              { t: 1, ...ROOT },
            ]}
            pointsB={[
              { t: 0, ...ROOT },
              { t: 0.08, ...RIGHT },
              { t: 0.28, ...RIGHT },
              { t: 0.4, ...RIGHT },
              { t: 0.55, ...RIGHT },
              { t: 0.7, ...RIGHT },
              { t: 0.85, ...ROOT },
              { t: 1, ...ROOT },
            ]}
            leftStroke={{
              values: `${IDLE};${RUN};${OK};${RUN};${OK};${RUN};${FAIL};${FAIL}`,
              times: "0;0.08;0.22;0.3;0.42;0.5;0.66;1",
            }}
            rightStroke={{
              values: `${IDLE};${RUN};${RUN};${RUN};${IDLE};${IDLE}`,
              times: "0;0.08;0.4;0.62;0.72;1",
            }}
            leftNotes={[
              { text: "SUCCESS", color: OK, from: 0.08, to: 0.5 },
              { text: "FAILURE", color: FAIL, from: 0.5, to: 1 },
            ]}
            rightNotes={[
              { text: "RUNNING", color: RUN, from: 0.08, to: 0.68 },
              { text: "halt", color: FAIL, from: 0.68, to: 1 },
            ]}
          />
        }
        example={
          <Example
            name="Parallel"
            attrs={[
              ["success_count", "1"],
              ["failure_count", "1"],
            ]}
            children={["KeepRunningUntilFailure", "FollowPath"]}
          />
        }
      />
      <Card
        animation={
          <Decorator
            title="RateController  ·  5 Hz"
            child="PathClear"
            dur="7s"
            inboundStill={{ t: 1, ...DEC_ROOT }}
            passStill={{ t: 1, ...DEC_CHILD }}
            // Ball runs down the edge from the unspecified parent into RateController — often.
            inbound={[
              { t: 0, ...DEC_ABOVE },
              { t: 0.05, ...DEC_ROOT },
              { t: 0.1, ...DEC_ABOVE },
              { t: 0.15, ...DEC_ROOT },
              { t: 0.2, ...DEC_ABOVE },
              { t: 0.25, ...DEC_ROOT },
              { t: 0.3, ...DEC_ABOVE },
              { t: 0.35, ...DEC_ROOT },
              { t: 0.4, ...DEC_ABOVE },
              { t: 0.45, ...DEC_ROOT },
              { t: 0.5, ...DEC_ABOVE },
              { t: 0.55, ...DEC_ROOT },
              { t: 0.6, ...DEC_ABOVE },
              { t: 0.65, ...DEC_ROOT },
              { t: 0.7, ...DEC_ABOVE },
              { t: 0.75, ...DEC_ROOT },
              { t: 0.8, ...DEC_ABOVE },
              { t: 0.85, ...DEC_ROOT },
              { t: 0.9, ...DEC_ABOVE },
              { t: 0.95, ...DEC_ROOT },
              { t: 1, ...DEC_ABOVE },
            ]}
            // Only some of those are forwarded to PathClear (5 Hz).
            pass={[
              { t: 0, ...DEC_ROOT },
              { t: 0.08, ...DEC_ROOT },
              { t: 0.14, ...DEC_CHILD },
              { t: 0.22, ...DEC_ROOT },
              { t: 0.34, ...DEC_ROOT },
              { t: 0.4, ...DEC_CHILD },
              { t: 0.48, ...DEC_ROOT },
              { t: 0.6, ...DEC_ROOT },
              { t: 0.66, ...DEC_CHILD },
              { t: 0.74, ...DEC_ROOT },
              { t: 0.86, ...DEC_ROOT },
              { t: 0.92, ...DEC_CHILD },
              { t: 1, ...DEC_ROOT },
            ]}
            parentStroke={{
              values: `${IDLE};${RUN};${OK};${RUN};${OK};${RUN};${OK};${RUN};${OK}`,
              times: "0;0.05;0.12;0.25;0.32;0.5;0.55;0.8;1",
            }}
            childStroke={{
              values: `${IDLE};${IDLE};${RUN};${OK};${IDLE};${IDLE};${RUN};${OK};${IDLE};${IDLE};${RUN};${OK};${IDLE};${IDLE};${RUN};${OK};${IDLE}`,
              times: "0;0.1;0.14;0.22;0.28;0.36;0.4;0.48;0.54;0.62;0.66;0.74;0.8;0.88;0.92;0.98;1",
            }}
            parentNotes={[
              { text: "viele Ticks", color: RUN, from: 0, to: 0.35 },
              { text: "filtert auf 5 Hz", color: WAIT, from: 0.35, to: 1 },
            ]}
            childNotes={[
              { text: "idle", color: WAIT, from: 0, to: 0.12 },
              { text: "Tick", color: OK, from: 0.12, to: 0.24 },
              { text: "idle", color: WAIT, from: 0.24, to: 0.38 },
              { text: "Tick", color: OK, from: 0.38, to: 0.5 },
              { text: "idle", color: WAIT, from: 0.5, to: 0.64 },
              { text: "Tick", color: OK, from: 0.64, to: 0.76 },
              { text: "idle", color: WAIT, from: 0.76, to: 0.9 },
              { text: "Tick", color: OK, from: 0.9, to: 1 },
            ]}
          />
        }
        example={
          <Example name="RateController" attrs={[["hz", "5.0"]]} children={["PathClear"]} />
        }
      />
    </>
  );
}

export function BtTickAnimation({ mode = "struktur" }: { mode?: "struktur" | "monitor" }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className={`grid gap-px bg-[#475569] ${mode === "monitor" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"}`}>
        {mode === "monitor" ? <MonitorCards /> : <StrukturCards />}
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-xs font-semibold text-foreground">
        <Legend color="#facc15" label="Tick" />
        <Legend color={RUN} label="RUNNING" />
        <Legend color={OK} label="SUCCESS" />
        <Legend color={FAIL} label="FAILURE" />
      </p>
      <style>{`
        .bt-tick-still { opacity: 0; }
        @media (prefers-reduced-motion: reduce) {
          .bt-tick-move { opacity: 0; }
          .bt-tick-still { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }): ReactNode {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

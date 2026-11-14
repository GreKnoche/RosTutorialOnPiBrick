"use client";

import type { ReactNode } from "react";

type Point = { t: number; x: number; y: number };

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
  stroke?: { values: string; times: string };
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

function Note({
  x,
  text,
  color,
  dur,
  fill,
}: {
  x: number;
  text: string;
  color: string;
  dur?: string;
  fill?: { values: string; times: string };
}) {
  return (
    <text x={x} y={91} textAnchor="middle" fill={color} fontSize={11} fontWeight={700} fontFamily="ui-sans-serif, system-ui">
      {text}
      {dur && fill ? <animate attributeName="fill" values={fill.values} keyTimes={fill.times} dur={dur} repeatCount="indefinite" /> : null}
    </text>
  );
}

function Pair({
  title,
  left,
  right,
  dur,
  points,
  still,
  leftStroke,
  rightStroke,
  leftNote,
  rightNote,
  leftColor,
  rightColor,
  leftFill,
  rightFill,
}: {
  title: string;
  left: string;
  right: string;
  dur: string;
  points: Point[];
  still: Point;
  leftStroke: { values: string; times: string };
  rightStroke?: { values: string; times: string };
  leftNote: string;
  rightNote: string;
  leftColor: string;
  rightColor: string;
  leftFill?: { values: string; times: string };
  rightFill?: { values: string; times: string };
}) {
  return (
    <svg viewBox="0 0 220 100" className="block h-auto w-full" role="img" aria-label={title}>
      <line x1={ROOT.x} y1={24} x2={LEFT.x} y2={46} stroke="#cbd5e1" strokeWidth={1.5} />
      <line x1={ROOT.x} y1={24} x2={RIGHT.x} y2={46} stroke="#cbd5e1" strokeWidth={1.5} />
      <Box x={16} y={2} w={188} h={22} label={title} size={9} />
      <Box x={4} y={46} w={96} h={20} label={left} size={8} dur={dur} stroke={leftStroke} />
      <Box x={120} y={46} w={96} h={20} label={right} size={8} dur={dur} stroke={rightStroke} />
      <Tick points={points} dur={dur} still={still} />
      <Note x={LEFT.x} text={leftNote} color={leftColor} dur={dur} fill={leftFill} />
      <Note x={RIGHT.x} text={rightNote} color={rightColor} dur={dur} fill={rightFill} />
    </svg>
  );
}

function Example({ name, attrs, children }: { name: string; attrs?: [string, string][]; children: string[] }) {
  return (
    <pre className="m-0 overflow-auto rounded-lg border border-border bg-[#1c1404] px-2.5 py-2 font-mono text-[0.62rem] leading-[1.45] whitespace-pre text-[#f4efe4]">
      <span className="text-[#ffe14a]">{`<${name}`}</span>
      {attrs?.length ? (
        <>
          {"\n"}
          {attrs.map(([key, value], index) => (
            <span key={key}>
              {"  "}
              <span className="text-[#c9b896]">{key}</span>
              <span className="text-[#ffe14a]">=</span>
              <span className="text-[#f0b48a]">{`"${value}"`}</span>
              {index === attrs.length - 1 ? <span className="text-[#ffe14a]">{">"}</span> : null}
              {"\n"}
            </span>
          ))}
        </>
      ) : (
        <span className="text-[#ffe14a]">{">\n"}</span>
      )}
      {children.map((child) => (
        <span key={child} className="text-[#ffe14a]">{`  <${child}/>\n`}</span>
      ))}
      <span className="text-[#ffe14a]">{`</${name}>`}</span>
    </pre>
  );
}

const hold = (color: string) => ({ values: `${IDLE};${IDLE};${color};${color}`, times: "0;0.28;0.4;1" });
const late = (color: string) => ({ values: `${IDLE};${IDLE};${color};${color}`, times: "0;0.32;0.44;1" });

export function BtTickAnimation() {
  return (
    <div className="flex flex-col gap-2">
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid grid-cols-4 gap-px bg-[#475569]">
        <div className="bg-[#334155] px-1 py-1.5">
          <Pair
            title="Sequence"
            left="Kind 1"
            right="Kind 2"
            dur="4.5s"
            still={{ t: 1, ...LEFT }}
            points={[
              { t: 0, ...ROOT },
              { t: 0.08, ...ROOT },
              { t: 0.32, ...LEFT },
              { t: 1, ...LEFT },
            ]}
            leftStroke={hold(RUN)}
            leftNote="RUNNING"
            rightNote="wartet"
            leftColor={RUN}
            rightColor={WAIT}
          />
        </div>
        <div className="bg-[#334155] px-1 py-1.5">
          <Pair
            title="Fallback"
            left="Kind 1"
            right="Kind 2"
            dur="4.5s"
            still={{ t: 1, ...LEFT }}
            points={[
              { t: 0, ...ROOT },
              { t: 0.08, ...ROOT },
              { t: 0.32, ...LEFT },
              { t: 1, ...LEFT },
            ]}
            leftStroke={hold(OK)}
            leftNote="SUCCESS"
            rightNote="stoppt"
            leftColor={OK}
            rightColor={WAIT}
          />
        </div>
        <div className="bg-[#334155] px-1 py-1.5">
          <Pair
            title="PipelineSequence"
            left="Plan"
            right="FollowPath"
            dur="5.5s"
            still={{ t: 1, ...RIGHT }}
            points={[
              { t: 0, ...ROOT },
              { t: 0.12, ...LEFT },
              { t: 0.32, ...RIGHT },
              { t: 0.52, ...LEFT },
              { t: 0.72, ...RIGHT },
              { t: 1, ...RIGHT },
            ]}
            leftStroke={{
              values: `${IDLE};${RUN};${IDLE};${RUN};${IDLE};${IDLE}`,
              times: "0;0.16;0.32;0.56;0.72;1",
            }}
            rightStroke={late(RUN)}
            leftNote="erneut"
            rightNote="RUNNING"
            leftColor={WAIT}
            rightColor={RUN}
            leftFill={{ values: `${WAIT};${RUN};${WAIT};${RUN};${WAIT};${WAIT}`, times: "0;0.16;0.32;0.56;0.72;1" }}
          />
        </div>
        <div className="bg-[#334155] px-1 py-1.5">
          <Pair
            title="RecoveryNode"
            left="Hauptast"
            right="BackUp"
            dur="6s"
            still={{ t: 1, ...LEFT }}
            points={[
              { t: 0, ...ROOT },
              { t: 0.16, ...LEFT },
              { t: 0.34, ...LEFT },
              { t: 0.52, ...RIGHT },
              { t: 0.7, ...RIGHT },
              { t: 0.86, ...LEFT },
              { t: 1, ...LEFT },
            ]}
            leftStroke={{
              values: `${IDLE};${FAIL};${FAIL};${RUN};${RUN}`,
              times: "0;0.3;0.52;0.86;1",
            }}
            rightStroke={{
              values: `${IDLE};${IDLE};${OK};${IDLE};${IDLE}`,
              times: "0;0.46;0.58;0.78;1",
            }}
            leftNote="danach neu"
            rightNote="BackUp"
            leftColor={FAIL}
            rightColor={WAIT}
            leftFill={{ values: `${WAIT};${FAIL};${FAIL};${RUN};${RUN}`, times: "0;0.3;0.52;0.86;1" }}
            rightFill={{ values: `${WAIT};${WAIT};${OK};${WAIT};${WAIT}`, times: "0;0.46;0.58;0.78;1" }}
          />
        </div>
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
      <div className="grid grid-cols-4 gap-2">
        <Example name="Sequence" children={["Kind1", "Kind2"]} />
        <Example name="Fallback" children={["Kind1", "Kind2"]} />
        <Example name="PipelineSequence" children={["Plan", "FollowPath"]} />
        <Example
          name="RecoveryNode"
          attrs={[
            ["number_of_retries", "1"],
            ["name", "NavigateRecovery"],
          ]}
          children={["Hauptast", "BackUp"]}
        />
      </div>
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

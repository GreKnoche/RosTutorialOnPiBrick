"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

function Beat({
  caption,
  children,
}: {
  caption: string;
  children: (run: number) => ReactNode;
}) {
  const [run, setRun] = useState(0);
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="bg-[#12110e]">{children(run)}</div>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <p className="text-sm leading-6">{caption}</p>
        <Button type="button" onClick={() => setRun((value) => value + 1)}>
          Noch einmal
        </Button>
      </div>
    </div>
  );
}

function Field({
  run,
  label,
  children,
}: {
  run: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <svg key={run} viewBox="0 0 640 220" role="img" aria-label={label} className="block h-auto w-full">
      <rect width="640" height="220" fill="#12110e" />
      {children}
    </svg>
  );
}

export function PathBeat() {
  return (
    <Beat caption="Dijkstra startet am Ziel. Der Pfad folgt dem Gefälle um den Block. Eine Geschwindigkeit entsteht hier nicht.">
      {(run) => (
        <Field run={run} label="NavFn legt den Pfad um den Block">
          <rect x="286" y="78" width="68" height="68" rx="4" fill="#3c3b38" />
          <text x="320" y="118" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="ui-sans-serif, system-ui">
            Block
          </text>
          <circle cx="96" cy="168" r="7" fill="#f8fafc" />
          <text x="96" y="196" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="ui-sans-serif, system-ui">
            Start
          </text>
          <circle cx="548" cy="52" r="7" fill="#34d399" />
          <text x="548" y="36" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="ui-sans-serif, system-ui">
            Ziel
          </text>
          <path
            d="M 96 168 C 180 168, 210 40, 320 36 C 450 32, 470 52, 548 52"
            fill="none"
            stroke="#e6b325"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="520"
            strokeDashoffset="520"
          >
            <animate attributeName="stroke-dashoffset" from="520" to="0" dur="2.4s" fill="freeze" />
          </path>
        </Field>
      )}
    </Beat>
  );
}

export function CmdBeat() {
  return (
    <Beat caption="Der Pfad liegt schon. Zwanzigmal pro Sekunde schreibt der Controller /cmd_vel. Auf der Geraden sind das 0.12 m/s.">
      {(run) => (
        <Field run={run} label="Der Controller schreibt eine Geschwindigkeit entlang des Pfads">
          <path
            d="M 90 156 C 200 156, 260 78, 400 78 C 500 78, 540 116, 560 156"
            fill="none"
            stroke="#e6b325"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="90" cy="156" r="11" fill="#f8fafc" />
          <line x1="90" y1="156" x2="188" y2="112" stroke="#34d399" strokeWidth="4" strokeLinecap="round">
            <animate attributeName="x2" values="90;188;188" keyTimes="0;0.45;1" dur="2.2s" fill="freeze" />
            <animate attributeName="y2" values="156;112;112" keyTimes="0;0.45;1" dur="2.2s" fill="freeze" />
          </line>
          <text x="200" y="108" fill="#34d399" fontSize="13" fontFamily="ui-monospace, monospace">
            /cmd_vel
          </text>
        </Field>
      )}
    </Beat>
  );
}

export function LookaheadBeat() {
  return (
    <Beat caption="Die Vorausschau ist die aktuelle Geschwindigkeit mal 1.5 s. Sie bleibt zwischen 0.12 m und 0.35 m. Der feste Wert 0.22 m gilt hier nicht.">
      {(run) => (
        <Field run={run} label="Lookahead zwischen 0.12 m und 0.35 m">
          <line x1="80" y1="120" x2="590" y2="120" stroke="#3f3f46" strokeWidth="2" />
          <rect x="176" y="108" width="184" height="24" fill="#14532d" opacity="0.85" />
          <circle cx="80" cy="120" r="10" fill="#f8fafc" />
          <line x1="176" y1="96" x2="176" y2="144" stroke="#94a3b8" strokeWidth="2" />
          <line x1="360" y1="96" x2="360" y2="144" stroke="#94a3b8" strokeWidth="2" />
          <text x="176" y="78" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="ui-monospace, monospace">
            0.12 m
          </text>
          <text x="360" y="78" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="ui-monospace, monospace">
            0.35 m
          </text>
          <text x="268" y="176" textAnchor="middle" fill="#34d399" fontSize="14" fontFamily="ui-monospace, monospace">
            v × 1.5 s
          </text>
        </Field>
      )}
    </Beat>
  );
}

export function RotateBeat() {
  return (
    <Beat caption="Liegt der Winkel zum Lookahead über 0.4 rad, ist die Vorwärtsgeschwindigkeit 0. Die Drehung geht auf 0.7 rad/s.">
      {(run) => (
        <Field run={run} label="Der Roboter dreht auf der Stelle zum Lookahead">
          <path d="M 300 170 L 520 70" fill="none" stroke="#e6b325" strokeWidth="3" strokeLinecap="round" />
          <circle cx="454" cy="100" r="6" fill="#34d399" />
          <text x="470" y="92" fill="#94a3b8" fontSize="12" fontFamily="ui-sans-serif, system-ui">
            Lookahead
          </text>
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="70 300 170"
              to="-24 300 170"
              dur="1.8s"
              fill="freeze"
            />
            <polygon points="300,148 288,178 312,178" fill="#f8fafc" />
          </g>
          <text x="80" y="48" fill="#e2e8f0" fontSize="14" fontFamily="ui-monospace, monospace">
            Winkel &gt; 0.4 rad
          </text>
          <text x="80" y="72" fill="#34d399" fontSize="14" fontFamily="ui-monospace, monospace">
            v = 0
          </text>
        </Field>
      )}
    </Beat>
  );
}

export function CurveBeat() {
  return (
    <Beat caption="Liegt der Radius unter 0.12 m, sinkt die Vorwärtsgeschwindigkeit. Sie bleibt mindestens 0.04 m/s. Unter 0.4 rad dreht der Roboter dabei weiter vorwärts.">
      {(run) => (
        <Field run={run} label="In der engen Kurve wird die Vorwärtsgeschwindigkeit kleiner">
          <path
            d="M 80 160 C 180 160, 220 160, 260 120 C 300 80, 300 60, 360 60"
            fill="none"
            stroke="#e6b325"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="248" cy="132" r="10" fill="#f8fafc" />
          <line x1="248" y1="132" x2="292" y2="108" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
          <text x="400" y="88" fill="#e2e8f0" fontSize="14" fontFamily="ui-monospace, monospace">
            Radius &lt; 0.12 m
          </text>
          <text x="400" y="114" fill="#34d399" fontSize="14" fontFamily="ui-monospace, monospace">
            v wird kleiner
          </text>
          <text x="400" y="140" fill="#94a3b8" fontSize="13" fontFamily="ui-monospace, monospace">
            mindestens 0.04 m/s
          </text>
        </Field>
      )}
    </Beat>
  );
}

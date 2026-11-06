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

const S = 46;
const VALUES = [
  [255, 255, 255, 255],
  [255, 0, 128, 255],
  [255, 255, 255, 255],
];

export function ImageBeat() {
  const left = 168;
  const top = 36;
  return (
    <Beat caption="Oben steht die erste Zeile der Datei. Weiß ist 255, Schwarz ist 0, Grau ist 128.">
      {(run) => (
        <svg key={run} viewBox="0 0 640 230" role="img" aria-label="Graubild mit vier Spalten und drei Zeilen" className="block h-auto w-full">
          <rect width="640" height="230" fill="#12110e" />
          <text x={left} y="24" fill="#a8a29e" fontSize="12" fontFamily="ui-sans-serif, system-ui">
            oben in der Datei
          </text>
          {VALUES.map((row, rowIndex) =>
            row.map((value, column) => {
              const fill = value === 0 ? "#171717" : value === 128 ? "#737373" : "#e7e5e4";
              const ink = value === 255 ? "#1c1917" : "#f5f5f4";
              return (
                <g key={`${rowIndex}-${column}`}>
                  <rect
                    x={left + column * S}
                    y={top + rowIndex * S}
                    width={S - 4}
                    height={S - 4}
                    rx="3"
                    fill={fill}
                    stroke={value === 0 || value === 128 ? "#fb923c" : "#44403c"}
                    strokeWidth={value === 0 || value === 128 ? 2 : 1}
                  />
                  <text
                    x={left + column * S + (S - 4) / 2}
                    y={top + rowIndex * S + 28}
                    textAnchor="middle"
                    fill={ink}
                    fontSize="13"
                    fontFamily="ui-monospace, monospace"
                  >
                    {value}
                  </text>
                </g>
              );
            }),
          )}
          <text x={left} y={top + 3 * S + 18} fill="#a8a29e" fontSize="12" fontFamily="ui-sans-serif, system-ui">
            unten in der Datei
          </text>
        </svg>
      )}
    </Beat>
  );
}

export function CellBeat() {
  const left = 150;
  const bottom = 176;
  const rows = [
    { j: 2, values: [255, 255, 255, 255] },
    { j: 1, values: [255, 0, 128, 255] },
    { j: 0, values: [255, 255, 255, 255] },
  ];
  return (
    <Beat caption="Zeile 0 liegt unten am Ursprung. Die schwarze Zelle ist Spalte 1 und Zeile 1. Die graue Zelle ist Spalte 2 und Zeile 1.">
      {(run) => (
        <svg key={run} viewBox="0 0 640 250" role="img" aria-label="Dieselbe Karte mit Ursprung links unten" className="block h-auto w-full">
          <rect width="640" height="250" fill="#12110e" />
          {rows.map((row) =>
            row.values.map((value, i) => {
              const fill = value === 0 ? "#171717" : value === 128 ? "#737373" : "#e7e5e4";
              const y = bottom - (row.j + 1) * S;
              return (
                <g key={`${row.j}-${i}`}>
                  <rect
                    x={left + i * S}
                    y={y}
                    width={S - 4}
                    height={S - 4}
                    rx="3"
                    fill={fill}
                    stroke={value === 255 ? "#44403c" : "#fb923c"}
                    strokeWidth={value === 255 ? 1 : 2}
                  />
                  {value !== 255 ? (
                    <text
                      x={left + i * S + (S - 4) / 2}
                      y={y + 27}
                      textAnchor="middle"
                      fill="#f5f5f4"
                      fontSize="12"
                      fontFamily="ui-monospace, monospace"
                    >
                      {value === 0 ? "0" : "128"}
                    </text>
                  ) : null}
                </g>
              );
            }),
          )}
          {[0, 1, 2, 3].map((i) => (
            <text
              key={`col-${i}`}
              x={left + i * S + (S - 4) / 2}
              y={bottom + 18}
              textAnchor="middle"
              fill="#a8a29e"
              fontSize="12"
              fontFamily="ui-monospace, monospace"
            >
              {i}
            </text>
          ))}
          {[0, 1, 2].map((j) => (
            <text
              key={`row-${j}`}
              x={left - 16}
              y={bottom - j * S - S / 2 + 4}
              textAnchor="end"
              fill="#a8a29e"
              fontSize="12"
              fontFamily="ui-monospace, monospace"
            >
              {j}
            </text>
          ))}
          <text x={left + 8} y={bottom + 40} fill="#fb923c" fontSize="12" fontFamily="ui-sans-serif, system-ui">
            Ursprung, Ecke der Zelle 0
          </text>
          <text x="360" y="48" fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
            frei
          </text>
          <text x="360" y="72" fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
            unbekannt
          </text>
          <text x="360" y="96" fill="#fb923c" fontSize="13" fontFamily="ui-sans-serif, system-ui">
            belegt
          </text>
          <line x1="360" y1="118" x2="560" y2="118" stroke="#57534e" strokeWidth="4" strokeLinecap="round" />
          <line x1="410" y1="110" x2="410" y2="126" stroke="#e7e5e4" strokeWidth="2" />
          <line x1="490" y1="110" x2="490" y2="126" stroke="#fb923c" strokeWidth="2" />
          <text x="360" y="140" fill="#a8a29e" fontSize="11" fontFamily="ui-monospace, monospace">
            0
          </text>
          <text x="410" y="140" textAnchor="middle" fill="#a8a29e" fontSize="11" fontFamily="ui-monospace, monospace">
            0,25
          </text>
          <text x="490" y="140" textAnchor="middle" fill="#fb923c" fontSize="11" fontFamily="ui-monospace, monospace">
            0,65
          </text>
          <text x="560" y="140" textAnchor="end" fill="#a8a29e" fontSize="11" fontFamily="ui-monospace, monospace">
            1
          </text>
        </svg>
      )}
    </Beat>
  );
}

export function TopicBeat() {
  return (
    <Beat caption="Der Map Server schreibt /map. Die static_layer liest es. Der Planer sieht nur die Costmap.">
      {(run) => (
        <svg key={run} viewBox="0 0 640 200" role="img" aria-label="Der Map Server veröffentlicht die Karte, die Costmap liest sie" className="block h-auto w-full">
          <rect width="640" height="200" fill="#12110e" />
          <rect x="36" y="64" width="160" height="64" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <text x="116" y="92" textAnchor="middle" fill="#f8fafc" fontSize="14" fontFamily="ui-sans-serif, system-ui">
            Map Server
          </text>
          <text x="116" y="112" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="ui-monospace, monospace">
            liest die Datei
          </text>
          <rect x="420" y="64" width="180" height="64" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <text x="510" y="92" textAnchor="middle" fill="#f8fafc" fontSize="14" fontFamily="ui-sans-serif, system-ui">
            static_layer
          </text>
          <text x="510" y="112" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="ui-monospace, monospace">
            liest /map
          </text>
          <line className="map-link" x1="196" y1="96" x2="420" y2="96" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
          <text x="308" y="84" textAnchor="middle" fill="#fb923c" fontSize="13" fontFamily="ui-monospace, monospace">
            /map
          </text>
          <style jsx global>{`
            .map-link {
              stroke-dasharray: 224;
              stroke-dashoffset: 224;
              animation: map-link 2.2s ease-in-out forwards;
            }
            @keyframes map-link {
              to {
                stroke-dashoffset: 0;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .map-link {
                animation: none;
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </svg>
      )}
    </Beat>
  );
}

export function FilesBeat() {
  return (
    <Beat caption="Auf dem Pi gibt es kein /map. In Gazebo schreibt slam_toolbox dasselbe Topic.">
      {(run) => (
        <svg key={run} viewBox="0 0 640 180" role="img" aria-label="Zwei Parameterdateien, nur Gazebo hat eine Karte" className="block h-auto w-full">
          <rect width="640" height="180" fill="#12110e" />
          <rect x="36" y="36" width="270" height="108" rx="8" fill="#1c1917" stroke="#44403c" strokeWidth="2" />
          <text x="56" y="64" fill="#e7e5e4" fontSize="14" fontFamily="ui-sans-serif, system-ui">
            nav2_params.yaml
          </text>
          <text x="56" y="92" fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
            kein Map Server
          </text>
          <text x="56" y="114" fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
            Costmap rollt in odom
          </text>
          <rect x="334" y="36" width="270" height="108" rx="8" fill="#1c1917" stroke="#fb923c" strokeWidth="2" />
          <text x="354" y="64" fill="#f5f5f4" fontSize="14" fontFamily="ui-sans-serif, system-ui">
            nav2_params_gazebo.yaml
          </text>
          <text x="354" y="92" fill="#fb923c" fontSize="13" fontFamily="ui-sans-serif, system-ui">
            slam_toolbox schreibt /map
          </text>
          <text x="354" y="114" fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
            static_layer liest /map
          </text>
        </svg>
      )}
    </Beat>
  );
}

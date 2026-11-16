"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export const NAV2_TOUR_KEY = "learn2ros.nav2.controls-intro";

export function nav2TourPending() {
  try {
    return localStorage.getItem(NAV2_TOUR_KEY) !== "1";
  } catch {
    return true;
  }
}

export function rememberNav2Tour() {
  try {
    localStorage.setItem(NAV2_TOUR_KEY, "1");
  } catch {
    /* private mode */
  }
}

type Side = "top" | "right" | "bottom" | "left";

type Outset = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type Align = "start" | "center" | "end";

type Guide = {
  id: string;
  title: string;
  body: string;
  side: Side;
  align?: Align;
  outset?: Partial<Outset>;
};

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Spot = Guide & {
  target: Box;
  hole: Box;
  card: Box;
};

const GUIDES: Guide[] = [
  {
    id: "next-chapter",
    title: "Nächstes Kapitel",
    body: "Die Kreise sind die Kapitel. Ein Klick wählt das nächste, Start beginnt die Mission.",
    side: "right",
    align: "start",
    outset: { left: 22, right: 42 },
  },
  {
    id: "code-graph",
    title: "Code Graph",
    body: "Klappt die Knoten auf. Ein Klick auf einen Knoten öffnet den Code für dieses Kapitel.",
    side: "right",
    align: "start",
  },
  {
    id: "play",
    title: "Code abspielen",
    body: "Der grüne Play startet den Code. Während Nav2 läuft, ist der Knopf rot und stoppt den Lauf.",
    side: "right",
    align: "start",
  },
  {
    id: "toggles",
    title: "Schalter",
    body: "Ein Klick schaltet an, der nächste aus. Blau heißt an: Lidar-Strahlen, Auto vergrößert, Kamerabild und Pfad. Die Costmap kommt ab dem Kapitel Costmap dazu.",
    side: "top",
    align: "center",
  },
  {
    id: "center",
    title: "Auf das Auto",
    body: "Zentriert die Karte auf das Auto.",
    side: "top",
    align: "end",
  },
];

const CARD_W = 240;
const PAD = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function overlaps(a: Box, b: Box, gap = 10) {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

function pointOnRect(rect: Box, fromX: number, fromY: number) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = cx - fromX;
  const dy = cy - fromY;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scaleX = dx !== 0 ? rect.w / 2 / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? rect.h / 2 / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx - dx * scale, y: cy - dy * scale };
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  return `M${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h - radius} Q${x + w},${y + h} ${x + w - radius},${y + h} H${x + radius} Q${x},${y + h} ${x},${y + h - radius} V${y + radius} Q${x},${y} ${x + radius},${y} Z`;
}

function placeCard(target: Box, side: Side, align: Align, cardH: number, boundsW: number, boundsH: number): Box {
  const gap = 18;
  let x = target.x;
  let y = target.y;
  if (side === "right" || side === "left") {
    x = side === "right" ? target.x + target.w + gap : target.x - CARD_W - gap;
    if (align === "start") y = target.y;
    else if (align === "end") y = target.y + target.h - cardH;
    else y = target.y + target.h / 2 - cardH / 2;
  } else {
    y = side === "top" ? target.y - cardH - gap : target.y + target.h + gap;
    if (align === "start") x = target.x;
    else if (align === "end") x = target.x + target.w - CARD_W;
    else x = target.x + target.w / 2 - CARD_W / 2;
  }
  return {
    x: clamp(x, 8, Math.max(8, boundsW - CARD_W - 8)),
    y: clamp(y, 8, Math.max(8, boundsH - cardH - 8)),
    w: CARD_W,
    h: cardH,
  };
}

function nudge(spots: Spot[], boundsW: number, boundsH: number) {
  for (let pass = 0; pass < 10; pass += 1) {
    let moved = false;
    for (let i = 0; i < spots.length; i += 1) {
      const card = spots[i].card;
      for (let j = 0; j < spots.length; j += 1) {
        if (i === j || !overlaps(card, spots[j].card, 8)) continue;
        const other = spots[j].card;
        const overlapX = Math.min(card.x + card.w, other.x + other.w) - Math.max(card.x, other.x);
        const overlapY = Math.min(card.y + card.h, other.y + other.h) - Math.max(card.y, other.y);
        if (overlapX < overlapY) card.x += card.x <= other.x ? -(overlapX + 12) : overlapX + 12;
        else card.y += card.y <= other.y ? -(overlapY + 12) : overlapY + 12;
        moved = true;
      }
      card.x = clamp(card.x, 8, Math.max(8, boundsW - card.w - 8));
      card.y = clamp(card.y, 8, Math.max(8, boundsH - card.h - 8));
      for (const spot of spots) {
        if (spot.card === card || !overlaps(card, spot.hole, 6)) continue;
        card.x = spot.hole.x + spot.hole.w + 12;
        card.x = clamp(card.x, 8, Math.max(8, boundsW - card.w - 8));
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function holeFor(target: Box, outset?: Partial<Outset>): Box {
  const top = outset?.top ?? PAD;
  const right = outset?.right ?? PAD;
  const bottom = outset?.bottom ?? PAD;
  const left = outset?.left ?? PAD;
  return {
    x: target.x - left,
    y: target.y - top,
    w: target.w + left + right,
    h: target.h + top + bottom,
  };
}

function readSpots(root: HTMLElement, heights: Map<string, number>): { spots: Spot[]; width: number; height: number } {
  const bounds = root.getBoundingClientRect();
  const spots: Spot[] = [];
  for (const guide of GUIDES) {
    const el = root.querySelector(`[data-tour="${guide.id}"]`);
    if (!(el instanceof HTMLElement)) continue;
    const box = el.getBoundingClientRect();
    const target = {
      x: box.left - bounds.left,
      y: box.top - bounds.top,
      w: box.width,
      h: box.height,
    };
    const hole = holeFor(target, guide.outset);
    const cardH = heights.get(guide.id) ?? 108;
    spots.push({
      ...guide,
      target,
      hole,
      card: placeCard(hole, guide.side, guide.align ?? "center", cardH, bounds.width, bounds.height),
    });
  }
  nudge(spots, bounds.width, bounds.height);
  return { spots, width: bounds.width, height: bounds.height };
}

function sameSpots(prev: Spot[], next: Spot[]) {
  if (prev.length !== next.length) return false;
  return prev.every((spot, index) => {
    const other = next[index];
    if (!other || spot.id !== other.id) return false;
    return (
      Math.round(spot.card.x) === Math.round(other.card.x) &&
      Math.round(spot.card.y) === Math.round(other.card.y) &&
      Math.round(spot.card.h) === Math.round(other.card.h) &&
      Math.round(spot.target.x) === Math.round(other.target.x) &&
      Math.round(spot.target.y) === Math.round(other.target.y) &&
      Math.round(spot.target.w) === Math.round(other.target.w) &&
      Math.round(spot.target.h) === Math.round(other.target.h)
    );
  });
}

export function Nav2ControlsTour({
  rootRef,
  onClose,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const heightsRef = useRef(new Map<string, number>());
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      for (const guide of GUIDES) {
        const card = cardRefs.current.get(guide.id);
        if (!card) continue;
        const height = Math.ceil(card.getBoundingClientRect().height);
        if (heightsRef.current.get(guide.id) !== height) heightsRef.current.set(guide.id, height);
      }
      const next = readSpots(root, heightsRef.current);
      setSize((prev) =>
        prev.width === Math.round(next.width) && prev.height === Math.round(next.height)
          ? prev
          : { width: next.width, height: next.height },
      );
      setSpots((prev) => (sameSpots(prev, next.spots) ? prev : next.spots));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rootRef, spots]);

  const width = size.width;
  const height = size.height;
  const holes = spots.map((spot) => roundRect(spot.hole.x, spot.hole.y, spot.hole.w, spot.hole.h, 12)).join(" ");

  return (
    <div className="absolute inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="nav2-tour-title">
      <div className="absolute inset-0" />
      {width > 0 ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden
        >
          <path d={`M0,0 H${width} V${height} H0 Z ${holes}`} fill="rgba(28,20,4,0.62)" fillRule="evenodd" />
          <defs>
            <marker id="nav2-tour-arrow" viewBox="0 0 10 10" markerWidth="7" markerHeight="7" refX="9" refY="5" orient="auto">
              <path d="M0 0 L10 5 L0 10 Z" fill="#e6b325" />
            </marker>
          </defs>
          {spots.map((spot) => {
            const hole = spot.hole;
            const targetCenterX = hole.x + hole.w / 2;
            const targetCenterY = hole.y + hole.h / 2;
            const from = pointOnRect(spot.card, targetCenterX, targetCenterY);
            const to = pointOnRect(hole, spot.card.x + spot.card.w / 2, spot.card.y + spot.card.h / 2);
            return (
              <g key={spot.id}>
                <rect
                  x={hole.x}
                  y={hole.y}
                  width={hole.w}
                  height={hole.h}
                  rx="12"
                  fill="none"
                  stroke="#e6b325"
                  strokeWidth="2"
                />
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#e6b325"
                  strokeWidth="2.5"
                  markerEnd="url(#nav2-tour-arrow)"
                />
              </g>
            );
          })}
        </svg>
      ) : null}
      {spots.map((spot) => (
        <div
          key={spot.id}
          ref={(node) => {
            if (node) cardRefs.current.set(spot.id, node);
            else cardRefs.current.delete(spot.id);
          }}
          className="absolute z-10 w-60 rounded-lg border border-[#e6d7a2] bg-[#fffaf0] px-3 py-2 shadow-md"
          style={{ left: spot.card.x, top: spot.card.y }}
        >
          <p className="text-sm font-semibold text-heading">{spot.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#504d3d]">{spot.body}</p>
        </div>
      ))}
      <div className="fixed top-20 right-4 z-50 flex items-center gap-3 rounded-full border border-[#e6d7a2] bg-[#fffaf0] px-3 py-2 shadow-lg">
        <p id="nav2-tour-title" className="text-sm font-semibold text-heading">
          So bedienst du Nav2
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-full bg-[#2f6b4f] px-3 py-1 text-sm font-semibold text-white hover:bg-[#24543d]"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}

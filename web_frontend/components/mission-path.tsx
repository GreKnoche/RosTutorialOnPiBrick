"use client";

import { useState } from "react";
import { Check, Flag, Lock } from "lucide-react";

type Step = {
  id: string;
  title: string;
  task: string;
};

const STEPS: Step[] = [
  { id: "fahren", title: "Fahren", task: "Ein Punkt. Das Auto fährt hin." },
  { id: "wegpunkte", title: "Wegpunkte", task: "Mehrere Punkte, einer nach dem anderen." },
  { id: "nochmal", title: "Nochmal", task: "Dieselbe Reihe, noch einmal." },
  { id: "anhalten", title: "Anhalten", task: "Zu nah, und der Befehl stoppt." },
];

const SHIFT = [0, 22, 0, -22];

export function MissionPath({ onStart }: { onStart?: () => void }) {
  const done = 0;
  const current = Math.min(done, STEPS.length - 1);
  const [open, setOpen] = useState(true);
  const step = STEPS[current];

  return (
    <nav aria-label="Missionen" className="mx-auto w-full max-w-56 lg:mx-0">
      <ol className="relative flex flex-col items-center gap-8 py-2">
        <span className="absolute top-8 bottom-8 left-1/2 w-2 -translate-x-1/2 rounded-full bg-border" aria-hidden="true" />
        {STEPS.map((item, index) => {
          const state = index < done ? "done" : index === current ? "current" : "locked";
          return (
            <li key={item.id} className="relative z-10 flex w-full flex-col items-center" style={{ transform: `translateX(${SHIFT[index % SHIFT.length]}px)` }}>
              <button
                type="button"
                disabled={state === "locked"}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={state === "locked" ? `${item.title}, zu` : item.title}
                onClick={() => {
                  if (state === "current") setOpen((value) => !value);
                }}
                className={`flex size-16 items-center justify-center rounded-full border-b-4 ${
                  state === "done"
                    ? "border-b-[#1e4634] bg-[#2f6b4f] text-white"
                    : state === "current"
                      ? "border-b-[#a67c12] bg-[#e6b325] text-[#3c3214]"
                      : "cursor-not-allowed border-b-[#c6c6c4] bg-[#e4e4e2] text-[#8a877c]"
                }`}
              >
                {state === "done" ? <Check className="size-7" /> : state === "locked" ? <Lock className="size-6" /> : <Flag className="size-7" />}
              </button>
              <span className={`mt-2 text-center text-xs font-medium ${state === "locked" ? "text-[#8a877c]" : "text-heading"}`}>
                {item.title}
              </span>
              {state === "current" && open ? (
                <div className="mt-3 w-full rounded-2xl bg-card px-3 py-3 text-center ring-1 ring-border">
                  <p className="text-sm font-medium text-heading">{step.title}</p>
                  <p className="mt-1 text-xs leading-5">{step.task}</p>
                  <button
                    type="button"
                    onClick={() => onStart?.()}
                    className="font-display mt-3 h-9 w-full rounded-xl border-b-4 border-b-[#a67c12] bg-[#e6b325] text-sm tracking-[0.14em] text-[#3c3214] uppercase"
                  >
                    Start
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

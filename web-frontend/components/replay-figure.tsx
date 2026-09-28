"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ReplayFigure({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: (run: number) => ReactNode;
}) {
  const [run, setRun] = useState(0);

  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Animation
          </p>
          <h2 id={id} className="font-heading mt-1 text-lg font-semibold text-heading">
            {title}
          </h2>
        </div>
        <Button type="button" onClick={() => setRun((value) => value + 1)}>
          Noch einmal
        </Button>
      </div>
      {children(run)}
    </section>
  );
}

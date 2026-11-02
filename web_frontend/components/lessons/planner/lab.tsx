"use client";

import { CopySection } from "@/components/lessons/copy-section";
import { PlannerDemo } from "@/components/lessons/planner/demo";
import type { LessonCopy } from "@/lib/lesson-copy";

export function PlannerLab({ copy }: { copy: LessonCopy; nextHref?: string }) {
  return (
    <>
      <PlannerDemo />
      <CopySection copy={copy} id="datei" />
      <CopySection copy={copy} id="server" />
      <CopySection copy={copy} id="navfn" />
      <CopySection copy={copy} id="unbekannt" />
    </>
  );
}

"use client";

import { BtDemo } from "@/components/lessons/behavior-trees/demo";
import type { LessonCopy } from "@/lib/lesson-copy";

export function BehaviorTreesLab(_props: { copy: LessonCopy; nextHref?: string }) {
  return <BtDemo />;
}

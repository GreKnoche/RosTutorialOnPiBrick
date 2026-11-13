"use client";

import { LearningPath } from "@/components/learning-path";
import type { Nav2Done } from "@/lib/browser-draft";
import { PATH_STEPS, isMissionId, type MissionId } from "@/lib/nav2-lessons";

const EMPTY_DONE: Partial<Nav2Done> = {};

export function MissionPath({
  onStart,
  onSelect,
  onSetDone,
  done = EMPTY_DONE,
  runningId = null,
  heldId = null,
}: {
  onStart?: (id: MissionId) => void;
  onSelect?: (id: MissionId) => void;
  onSetDone?: (id: MissionId, done: boolean) => void;
  done?: Partial<Nav2Done>;
  runningId?: string | null;
  heldId?: string | null;
}) {
  return (
    <LearningPath
      steps={PATH_STEPS}
      startId="start"
      done={done}
      runningId={runningId}
      heldId={heldId}
      onStart={(id) => {
        if (isMissionId(id)) onStart?.(id);
      }}
      onSelect={(id) => {
        if (isMissionId(id)) onSelect?.(id);
      }}
      onSetDone={(id, next) => {
        if (isMissionId(id)) onSetDone?.(id, next);
      }}
    />
  );
}

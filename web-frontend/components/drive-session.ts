"use client";

import { useCallback, useEffect, useState } from "react";
import { markLessonComplete } from "@/lib/progress";
import type { TrackId } from "@/lib/types";

export function useDriveSession() {
  const [runId, setRunId] = useState(0);
  const [resetId, setResetId] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const drive = useCallback(() => {
    setFinished(false);
    setRunning(true);
    setRunId((id) => id + 1);
  }, []);

  const reset = useCallback(() => {
    setFinished(false);
    setRunning(false);
    setResetId((id) => id + 1);
  }, []);

  const finish = useCallback(() => {
    setRunning(false);
    setFinished(true);
  }, []);

  const clearFinished = useCallback(() => {
    setFinished(false);
  }, []);

  return { running, finished, runId, resetId, drive, reset, finish, clearFinished };
}

export function useMarkLessonComplete(track: TrackId, id: string, allDone: boolean) {
  useEffect(() => {
    if (!allDone) return;
    markLessonComplete(track, id);
  }, [allDone, track, id]);
}

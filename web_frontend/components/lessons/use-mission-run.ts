"use client";

import { useCallback, useState } from "react";
import { useDriveSession, useMarkLessonComplete } from "@/components/drive-session";
import type { TrackId } from "@/lib/types";

export function useMissionChecklist(ids: readonly string[]) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const openIndex = ids.findIndex((id) => !done[id]);
  const allDone = ids.length > 0 && openIndex === -1;
  const openId = allDone ? null : (ids[openIndex] ?? null);
  const mark = useCallback((id: string) => {
    setDone((current) => ({ ...current, [id]: true }));
  }, []);
  const reset = useCallback(() => {
    setDone({});
  }, []);

  return {
    done,
    openId,
    index: allDone ? ids.length : openIndex + 1,
    allDone,
    mark,
    reset,
  };
}

export function useMissionRun(options: { track: TrackId; lessonId: string; allDone: boolean }) {
  const session = useDriveSession();
  const [banner, setBanner] = useState<"task" | "success" | "hidden">("task");
  const [doneTitle, setDoneTitle] = useState<string | null>(null);
  useMarkLessonComplete(options.track, options.lessonId, options.allDone);
  const bannerUp = !options.allDone && banner !== "hidden";
  const succeed = useCallback((title: string) => {
    setDoneTitle(title);
    setBanner("success");
  }, []);
  const restart = useCallback(() => {
    setDoneTitle(null);
    setBanner("task");
    session.reset();
  }, [session.reset]);

  return { session, banner, setBanner, doneTitle, succeed, restart, bannerUp };
}

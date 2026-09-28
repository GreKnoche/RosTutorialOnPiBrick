"use client";

import { useEffect, useState } from "react";
import { PROGRESS_EVENT, readCompleted } from "@/lib/progress";

export function useCompletedKeys() {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    const load = () => setKeys(readCompleted());
    load();
    window.addEventListener(PROGRESS_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  return keys;
}

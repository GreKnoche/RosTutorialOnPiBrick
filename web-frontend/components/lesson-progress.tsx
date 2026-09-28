"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
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

export function CompletedMark({ done }: { done: boolean }) {
  if (!done) return null;
  return <Check aria-label="abgeschlossen" className="size-4 shrink-0 text-heading" />;
}

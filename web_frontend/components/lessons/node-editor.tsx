"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { lessonLevelKey, type LessonLevel } from "@/lib/lesson-levels";

export function NodeEditor({
  track,
  lessonId,
  level,
}: {
  track: string;
  lessonId: string;
  level: Extract<LessonLevel, "medium" | "hard">;
}) {
  const key = lessonLevelKey(track, lessonId);
  const [source, setSource] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState("Lade Knoten…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    const params = new URLSearchParams({ track, id: lessonId, level });
    fetch(`/api/lesson-node?${params}`)
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; source?: string; message?: string };
        if (cancel) return;
        if (!response.ok || body.ok !== true || typeof body.source !== "string") {
          setStatus(body.message ?? "Knoten nicht gefunden");
          return;
        }
        setSource(body.source);
        setSaved(body.source);
        setStatus("");
      })
      .catch(() => {
        if (!cancel) setStatus("Knoten nicht gefunden");
      });
    return () => {
      cancel = true;
    };
  }, [track, lessonId, level]);

  async function save() {
    setBusy(true);
    setStatus("Speichere…");
    try {
      const response = await fetch("/api/lesson-node", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, id: lessonId, level, source }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || body.ok !== true) {
        setStatus(body.message ?? "Speichern fehlgeschlagen");
        return;
      }
      setSaved(source);
      setStatus(`Gespeichert. ros2 run brick_lessons ${key}_${level} startet diese Datei.`);
    } catch {
      setStatus("Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = `${source.slice(0, start)}  ${source.slice(end)}`;
    setSource(next);
    requestAnimationFrame(() => {
      target.selectionStart = start + 2;
      target.selectionEnd = start + 2;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-heading">Knoten</h3>
        <Button type="button" onClick={save} disabled={busy || source === "" || source === saved}>
          Speichern
        </Button>
      </div>
      <label className="sr-only" htmlFor={`node-${key}-${level}`}>
        Knoten {key} {level}
      </label>
      <textarea
        id={`node-${key}-${level}`}
        value={source}
        onChange={(event) => setSource(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        className="min-h-[28rem] w-full resize-y rounded-lg border border-border bg-card p-3 font-mono text-[0.65rem] leading-5 text-foreground"
      />
      {status ? <p className="text-sm leading-6">{status}</p> : null}
    </div>
  );
}

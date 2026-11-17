"use client";

import { useEffect, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { CodeEditor, ResetCodeButton } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { readNodeDraft, serverText, subscribeDrafts, writeNodeDraft } from "@/lib/browser-draft";
import { lessonLevelKey, type LessonLevel } from "@/lib/lesson-levels";

export function NodeEditor({
  track,
  lessonId,
  level,
  highlight = false,
}: {
  track: string;
  lessonId: string;
  level: Extract<LessonLevel, "medium" | "hard">;
  highlight?: boolean;
}) {
  const key = lessonLevelKey(track, lessonId);
  const draftKey = `${track}:${lessonId}:${level}`;
  const draft = useSyncExternalStore(subscribeDrafts, () => readNodeDraft(track, lessonId, level), serverText);
  const [fileKey, setFileKey] = useState(draftKey);
  const [file, setFile] = useState<string | null>(null);
  const [status, setStatus] = useState("Lade Knoten…");
  const [busy, setBusy] = useState(false);
  let shownFile = file;
  if (fileKey !== draftKey) {
    shownFile = null;
    setFileKey(draftKey);
    setFile(null);
    setStatus("Lade Knoten…");
  }
  const source = draft ?? shownFile ?? "";

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
        setFile(body.source);
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
      setFile(source);
      writeNodeDraft(track, lessonId, level, null);
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
    writeNodeDraft(track, lessonId, level, next === file ? null : next);
    requestAnimationFrame(() => {
      target.selectionStart = start + 2;
      target.selectionEnd = start + 2;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-heading">Knoten</h3>
        <div className="flex items-center gap-2">
          {highlight ? (
            <ResetCodeButton
              disabled={file === null || source === file}
              onClick={() => writeNodeDraft(track, lessonId, level, null)}
            />
          ) : null}
          <Button type="button" onClick={save} disabled={busy || file === null || source === file}>
            Speichern
          </Button>
        </div>
      </div>
      {highlight ? (
        <CodeEditor
          value={source}
          onChange={(value) => writeNodeDraft(track, lessonId, level, value === file ? null : value)}
          label={`Knoten ${key} ${level}`}
          language="python"
          height="h-[28rem]"
        />
      ) : (
        <>
          <label className="sr-only" htmlFor={`node-${key}-${level}`}>
            Knoten {key} {level}
          </label>
          <textarea
            id={`node-${key}-${level}`}
            value={source}
            onChange={(event) =>
              writeNodeDraft(track, lessonId, level, event.target.value === file ? null : event.target.value)
            }
            onKeyDown={onKeyDown}
            spellCheck={false}
            className="min-h-[28rem] w-full resize-y rounded-lg border border-border bg-card p-3 font-mono text-[0.65rem] leading-5 text-foreground"
          />
        </>
      )}
      {status ? <p className="text-sm leading-6">{status}</p> : null}
    </div>
  );
}

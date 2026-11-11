"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const field =
  "w-full rounded-md bg-background px-2 py-1.5 text-sm ring-1 ring-foreground/15";

export function NewLessonForm({
  nextIds,
}: {
  nextIds: { autonom: string | null; ros: string | null };
}) {
  const router = useRouter();
  const [track, setTrack] = useState<"autonom" | "ros">("autonom");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const nextId = nextIds[track];

  async function createLesson() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/lesson-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ track, slug, title, summary }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      message?: string;
      lesson?: { track: string; slug: string };
    };
    setPending(false);
    if (!payload.ok || !payload.lesson) {
      setMessage(payload.message ?? "Anlegen fehlgeschlagen.");
      return;
    }
    router.push(`/studio/${payload.lesson.track}/${payload.lesson.slug}`);
    router.refresh();
  }

  return (
    <form
      className="grid gap-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void createLesson();
      }}
    >
      <h2 className="font-heading text-lg font-semibold">Neue Lektion</h2>
      <label className="grid gap-1 text-sm">
        <span>Track</span>
        <select
          className={field}
          value={track}
          onChange={(event) => setTrack(event.target.value === "ros" ? "ros" : "autonom")}
        >
          <option value="autonom">Autonom</option>
          <option value="ros">ROS 2</option>
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        Nächste Nummer: {nextId ?? "keine frei"}
      </p>
      <label className="grid gap-1 text-sm">
        <span>Titel</span>
        <input
          className={field}
          value={title}
          onChange={(event) => {
            const value = event.target.value;
            setTitle(value);
            if (!slugTouched) setSlug(slugify(value));
          }}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Kurzname</span>
        <input
          className={field}
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Kurztext</span>
        <textarea className={field} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !nextId}>
          Anlegen
        </Button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </form>
  );
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("de")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

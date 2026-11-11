"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  defaultLabor,
  LABOR_OPTIONS,
  type LaborKind,
  type LessonCopy,
  type LessonSectionCopy,
  type MissionCopy,
} from "@/lib/lesson-copy";
import type { LabKind, Lesson, LessonStatus } from "@/lib/types";

const field =
  "w-full rounded-md bg-background px-2 py-1.5 text-sm ring-1 ring-foreground/15";

export function LessonEditor({
  lesson,
  initialCopy,
  registered,
}: {
  lesson: Lesson;
  initialCopy: LessonCopy;
  registered: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [summary, setSummary] = useState(lesson.summary);
  const [status, setStatus] = useState<LessonStatus>(lesson.status);
  const [lab, setLab] = useState<LabKind>(lesson.lab);
  const [termsText, setTermsText] = useState((lesson.taughtTerms ?? []).join(", "));
  const [copy, setCopy] = useState(initialCopy);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/lesson-draft", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        track: lesson.track,
        id: lesson.id,
        slug: lesson.slug,
        title,
        summary,
        status,
        lab,
        taughtTerms: termsText
          .split(",")
          .map((term) => term.trim())
          .filter(Boolean),
        copy,
      }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      message?: string;
      lesson?: Lesson;
      copy?: LessonCopy;
    };
    setPending(false);
    if (!payload.ok || !payload.lesson || !payload.copy) {
      setMessage(payload.message ?? "Speichern fehlgeschlagen.");
      return;
    }
    setTitle(payload.lesson.title);
    setSummary(payload.lesson.summary);
    setStatus(payload.lesson.status);
    setLab(payload.lesson.lab);
    setTermsText((payload.lesson.taughtTerms ?? []).join(", "));
    setCopy(payload.copy);
    setMessage("Gespeichert.");
    router.refresh();
  }

  function updateSection(id: string, patch: Partial<LessonSectionCopy>) {
    setCopy((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [id]: { id, eyebrow: "", title: "", body: "", ...current.sections[id], ...patch },
      },
    }));
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {lesson.track} · {lesson.id} · {lesson.slug}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Lektion bearbeiten</h1>
        </div>
        <Link href={`/${lesson.track}/${lesson.slug}`} className="text-sm hover:text-heading">
          Lektion ansehen
        </Link>
      </div>
      {registered ? (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm leading-6">
          Der Twin kommt aus dem bestehenden Lab. Ein Labor-Baustein überschreibt dieses Lab nicht.
        </p>
      ) : null}
      <section className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span>Titel</span>
          <input className={field} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Kurztext</span>
          <textarea className={field} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>Status</span>
            <select
              className={field}
              value={status}
              onChange={(event) => setStatus(event.target.value === "ready" ? "ready" : "stub")}
            >
              <option value="stub">in Arbeit</option>
              <option value="ready">verfügbar</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Twin ohne Baustein</span>
            <select
              className={field}
              value={lab}
              onChange={(event) => setLab(event.target.value === "teleop" || event.target.value === "goal" ? event.target.value : "none")}
            >
              <option value="none">keine eigene Fahrt</option>
              <option value="teleop">Tastatur</option>
              <option value="goal">Zielpose</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span>Fachbegriffe, durch Komma getrennt</span>
          <input className={field} value={termsText} onChange={(event) => setTermsText(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Animationstitel</span>
          <input
            className={field}
            value={copy.animationTitle}
            onChange={(event) => setCopy((current) => ({ ...current, animationTitle: event.target.value }))}
          />
        </label>
      </section>
      <section className="grid gap-2">
        <h2 className="font-heading text-lg font-semibold">Einleitung</h2>
        <textarea
          className={field}
          rows={6}
          value={copy.intro}
          onChange={(event) => setCopy((current) => ({ ...current, intro: event.target.value }))}
        />
      </section>
      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Abschnitte</h2>
          <Button type="button" onClick={() => addSection(setCopy)}>
            Abschnitt
          </Button>
        </div>
        {copy.sectionOrder.map((id, index) => {
          const section = copy.sections[id];
          if (!section) return null;
          return (
            <div key={index} className="grid gap-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={index === 0} onClick={() => moveSection(setCopy, index, -1)}>
                  Nach oben
                </Button>
                <Button
                  type="button"
                  disabled={index === copy.sectionOrder.length - 1}
                  onClick={() => moveSection(setCopy, index, 1)}
                >
                  Nach unten
                </Button>
                <Button type="button" onClick={() => removeSection(setCopy, id)}>
                  Entfernen
                </Button>
              </div>
              <label className="grid gap-1 text-sm">
                <span>Id</span>
                <input
                  className={field}
                  value={section.id}
                  onChange={(event) => renameSection(setCopy, id, event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Eyebrow</span>
                <input
                  className={field}
                  value={section.eyebrow}
                  onChange={(event) => updateSection(id, { eyebrow: event.target.value })}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Titel</span>
                <input
                  className={field}
                  value={section.title}
                  onChange={(event) => updateSection(id, { title: event.target.value })}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Text</span>
                <textarea
                  className={`${field} font-mono`}
                  rows={8}
                  value={section.body}
                  onChange={(event) => updateSection(id, { body: event.target.value })}
                />
              </label>
            </div>
          );
        })}
      </section>
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Missionen</h2>
          <Button type="button" onClick={() => addMission(setCopy)}>
            Mission
          </Button>
        </div>
        <label className="grid gap-1 text-sm">
          <span>Satz über der Liste</span>
          <input
            className={field}
            value={copy.missions.intro}
            onChange={(event) =>
              setCopy((current) => ({
                ...current,
                missions: { ...current.missions, intro: event.target.value },
              }))
            }
          />
        </label>
        {copy.missions.items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={index === 0} onClick={() => moveMission(setCopy, index, -1)}>
                Nach oben
              </Button>
              <Button
                type="button"
                disabled={index === copy.missions.items.length - 1}
                onClick={() => moveMission(setCopy, index, 1)}
              >
                Nach unten
              </Button>
              <Button type="button" onClick={() => removeMission(setCopy, index)}>
                Entfernen
              </Button>
            </div>
            <MissionFields
              item={item}
              onChange={(patch) =>
                setCopy((current) => ({
                  ...current,
                  missions: {
                    ...current.missions,
                    items: current.missions.items.map((mission, missionIndex) =>
                      missionIndex === index ? { ...mission, ...patch } : mission,
                    ),
                  },
                }))
              }
            />
          </div>
        ))}
      </section>
      <FeedbackFields
        texts={copy.texts}
        onChange={(texts) => setCopy((current) => ({ ...current, texts }))}
      />
      <LaborFields
        labor={copy.labor}
        onChange={(labor) => setCopy((current) => ({ ...current, labor }))}
      />
      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={() => void save()}>
          Speichern
        </Button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </div>
  );
}

function MissionFields({
  item,
  onChange,
}: {
  item: MissionCopy;
  onChange: (patch: Partial<MissionCopy>) => void;
}) {
  return (
    <>
      <label className="grid gap-1 text-sm">
        <span>Id</span>
        <input className={field} value={item.id} onChange={(event) => onChange({ id: event.target.value })} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Titel</span>
        <input className={field} value={item.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Hinweis</span>
        <input className={field} value={item.hint} onChange={(event) => onChange({ hint: event.target.value })} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Aufgabe im Banner</span>
        <input className={field} value={item.task} onChange={(event) => onChange({ task: event.target.value })} />
      </label>
    </>
  );
}

function FeedbackFields({
  texts,
  onChange,
}: {
  texts: Record<string, string>;
  onChange: (texts: Record<string, string>) => void;
}) {
  const entries = Object.entries(texts);
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">Feedback</h2>
        <Button
          type="button"
          onClick={() => onChange({ ...texts, [nextKey(Object.keys(texts), "hinweis")]: "" })}
        >
          Satz
        </Button>
      </div>
      {entries.map(([key, value], index) => (
        <div key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[10rem_1fr_auto]">
          <input
            className={field}
            value={key}
            aria-label="Schlüssel"
            onChange={(event) => onChange(renameKey(texts, key, event.target.value))}
          />
          <input
            className={field}
            value={value}
            aria-label="Satz"
            onChange={(event) => onChange({ ...texts, [key]: event.target.value })}
          />
          <Button type="button" onClick={() => onChange(omitKey(texts, key))}>
            Entfernen
          </Button>
        </div>
      ))}
    </section>
  );
}

function LaborFields({
  labor,
  onChange,
}: {
  labor: LessonCopy["labor"];
  onChange: (labor: LessonCopy["labor"]) => void;
}) {
  const kind = labor?.kind ?? "";
  return (
    <section className="grid gap-3">
      <h2 className="font-heading text-lg font-semibold">Baustein am roten Twin</h2>
      <label className="grid gap-1 text-sm">
        <span>Baustein</span>
        <select
          className={field}
          value={kind}
          onChange={(event) => {
            const next = event.target.value;
            if (!next) {
              onChange(null);
              return;
            }
            const selected = next as LaborKind;
            onChange(labor?.kind === selected ? labor : defaultLabor(selected));
          }}
        >
          <option value="">keiner</option>
          {LABOR_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {labor?.kind === "gerade" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Umfang" unit="cm" value={labor.umfang} onChange={(umfang) => onChange({ ...labor, umfang })} />
          <NumberField
            label="Umdrehungen"
            value={labor.umdrehungen}
            onChange={(umdrehungen) => onChange({ ...labor, umdrehungen })}
          />
          <NumberField label="Zielstrecke" unit="m" value={labor.ziel} onChange={(ziel) => onChange({ ...labor, ziel })} />
          <NumberField
            label="Toleranz"
            unit="m"
            value={labor.toleranz}
            onChange={(toleranz) => onChange({ ...labor, toleranz })}
          />
        </div>
      ) : null}
      {labor?.kind === "drehung" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Radabstand" unit="cm" value={labor.abstand} onChange={(abstand) => onChange({ ...labor, abstand })} />
          <NumberField label="Weg links" unit="cm" value={labor.links} onChange={(links) => onChange({ ...labor, links })} />
          <NumberField label="Weg rechts" unit="cm" value={labor.rechts} onChange={(rechts) => onChange({ ...labor, rechts })} />
          <NumberField label="Zielwinkel" unit="°" value={labor.ziel} onChange={(ziel) => onChange({ ...labor, ziel })} />
          <NumberField
            label="Toleranz"
            unit="°"
            value={labor.toleranz}
            onChange={(toleranz) => onChange({ ...labor, toleranz })}
          />
        </div>
      ) : null}
      {labor?.kind === "pfad" ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Umfang" unit="cm" value={labor.umfang} onChange={(umfang) => onChange({ ...labor, umfang })} />
            <NumberField label="Radabstand" unit="cm" value={labor.abstand} onChange={(abstand) => onChange({ ...labor, abstand })} />
          </div>
          {labor.segmente.map((segment, index) => (
            <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <NumberField
                label={`Segment ${index + 1}, links`}
                unit="cm"
                value={segment.links}
                onChange={(links) => onChange(updateSegment(labor, index, { links }))}
              />
              <NumberField
                label={`Segment ${index + 1}, rechts`}
                unit="cm"
                value={segment.rechts}
                onChange={(rechts) => onChange(updateSegment(labor, index, { rechts }))}
              />
              <Button type="button" onClick={() => onChange(removeSegment(labor, index))}>
                Entfernen
              </Button>
            </div>
          ))}
          {labor.segmente.length < 4 ? (
            <Button
              type="button"
              onClick={() => onChange({ ...labor, segmente: [...labor.segmente, { links: 10, rechts: 10 }] })}
            >
              Segment
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          className={field}
          type="number"
          step="0.1"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
      </span>
    </label>
  );
}

function addSection(setCopy: (update: (current: LessonCopy) => LessonCopy) => void) {
  setCopy((current) => {
    const id = nextKey(current.sectionOrder, "abschnitt");
    return {
      ...current,
      sectionOrder: [...current.sectionOrder, id],
      sections: {
        ...current.sections,
        [id]: { id, eyebrow: "Abschnitt", title: "Zwischenüberschrift", body: "" },
      },
    };
  });
}

function removeSection(setCopy: (update: (current: LessonCopy) => LessonCopy) => void, id: string) {
  setCopy((current) => {
    const sections = { ...current.sections };
    delete sections[id];
    return { ...current, sections, sectionOrder: current.sectionOrder.filter((item) => item !== id) };
  });
}

function renameSection(
  setCopy: (update: (current: LessonCopy) => LessonCopy) => void,
  id: string,
  nextId: string,
) {
  setCopy((current) => {
    const section = current.sections[id];
    if (!section) return current;
    if (nextId === id) return { ...current, sections: { ...current.sections, [id]: { ...section, id: nextId } } };
    if (!/^[a-z0-9-]*$/.test(nextId) || current.sections[nextId]) return current;
    const sections = { ...current.sections };
    delete sections[id];
    sections[nextId] = { ...section, id: nextId };
    return {
      ...current,
      sections,
      sectionOrder: current.sectionOrder.map((item) => (item === id ? nextId : item)),
    };
  });
}

function moveSection(
  setCopy: (update: (current: LessonCopy) => LessonCopy) => void,
  index: number,
  direction: -1 | 1,
) {
  setCopy((current) => ({ ...current, sectionOrder: moveItem(current.sectionOrder, index, direction) }));
}

function addMission(setCopy: (update: (current: LessonCopy) => LessonCopy) => void) {
  setCopy((current) => {
    const id = nextKey(
      current.missions.items.map((item) => item.id),
      "mission",
    );
    return {
      ...current,
      missions: {
        ...current.missions,
        items: [...current.missions.items, { id, title: "Mission", hint: "", task: "" }],
      },
    };
  });
}

function removeMission(setCopy: (update: (current: LessonCopy) => LessonCopy) => void, index: number) {
  setCopy((current) => ({
    ...current,
    missions: {
      ...current.missions,
      items: current.missions.items.filter((_, itemIndex) => itemIndex !== index),
    },
  }));
}

function moveMission(
  setCopy: (update: (current: LessonCopy) => LessonCopy) => void,
  index: number,
  direction: -1 | 1,
) {
  setCopy((current) => ({
    ...current,
    missions: { ...current.missions, items: moveItem(current.missions.items, index, direction) },
  }));
}

function updateSegment(
  labor: NonNullable<LessonCopy["labor"]>,
  index: number,
  patch: Partial<{ links: number; rechts: number }>,
) {
  return {
    ...labor,
    segmente: labor.segmente.map((segment, segmentIndex) =>
      segmentIndex === index ? { ...segment, ...patch } : segment,
    ),
  };
}

function removeSegment(labor: NonNullable<LessonCopy["labor"]>, index: number) {
  return { ...labor, segmente: labor.segmente.filter((_, segmentIndex) => segmentIndex !== index) };
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = items.slice();
  const [item] = copy.splice(index, 1);
  if (item === undefined) return items;
  copy.splice(next, 0, item);
  return copy;
}

function nextKey(used: string[], prefix: string) {
  let index = used.length + 1;
  let key = `${prefix}-${index}`;
  while (used.includes(key)) {
    index += 1;
    key = `${prefix}-${index}`;
  }
  return key;
}

function renameKey(texts: Record<string, string>, key: string, next: string) {
  if (next === key) return texts;
  if (!/^[A-Za-z0-9_-]*$/.test(next) || (next !== key && Object.hasOwn(texts, next))) return texts;
  const entries = Object.entries(texts).map(([current, value]) =>
    current === key ? [next, value] : [current, value],
  );
  return Object.fromEntries(entries);
}

function omitKey(texts: Record<string, string>, key: string) {
  const next = { ...texts };
  delete next[key];
  return next;
}

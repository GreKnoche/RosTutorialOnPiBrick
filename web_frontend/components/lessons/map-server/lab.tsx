"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { CellBeat, FilesBeat, ImageBeat, TopicBeat } from "@/components/lessons/map-server/scenes";
import { MissionBoard } from "@/components/mission-board";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";

const UNKNOWN = "−1";

const CHOICES = {
  belegt: ["0", UNKNOWN, "100", "255"],
  unbekannt: ["0", UNKNOWN, "50", "100"],
  mitte: [
    "0,05 m und 0,05 m",
    "0,075 m und 0,075 m",
    "0,10 m und 0,10 m",
    "0,125 m und 0,075 m",
  ],
} as const;

const EXPECTED = {
  belegt: "100",
  unbekannt: UNKNOWN,
  mitte: "0,075 m und 0,075 m",
} as const;

type SlotId = keyof typeof EXPECTED;

export function MapServerLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  useMissionRun({ track: "nav2", lessonId: "06", allDone: checklist.allDone });

  const [choice, setChoice] = useState<Record<SlotId, string>>({
    belegt: "",
    unbekannt: "",
    mitte: "",
  });
  const [note, setNote] = useState<Record<SlotId, string>>({
    belegt: "",
    unbekannt: "",
    mitte: "",
  });

  const pick = (id: SlotId, value: string) => {
    setChoice((current) => ({ ...current, [id]: value }));
    setNote((current) => ({ ...current, [id]: "" }));
  };

  const verify = (id: SlotId) => {
    const value = choice[id];
    if (!value) {
      setNote((current) => ({ ...current, [id]: "Wähle zuerst einen Wert." }));
      return;
    }
    if (value === EXPECTED[id]) {
      checklist.mark(id);
      setNote((current) => ({ ...current, [id]: "" }));
      return;
    }
    const wrong = copy.texts[`${id}_wrong`];
    setNote((current) => ({ ...current, [id]: wrong ?? "Dieser Wert passt nicht." }));
  };

  const missions = copy.missions.items.map((item) => ({
    id: item.id,
    title: item.title,
    hint: item.hint,
    done: Boolean(checklist.done[item.id]),
  }));

  return (
    <div className="flex flex-col gap-6">
      <CopySection copy={copy} id="datei">
        <ImageBeat />
      </CopySection>
      <CopySection copy={copy} id="rechnung">
        <CellBeat />
      </CopySection>
      <CopySection copy={copy} id="topic">
        <TopicBeat />
      </CopySection>
      <CopySection copy={copy} id="dateien">
        <FilesBeat />
      </CopySection>

      <MissionBoard intro={copy.missions.intro} missions={missions} />
      {checklist.allDone ? null : (
        <p className="text-sm leading-6 text-muted-foreground">{copy.texts.idle}</p>
      )}

      {(["belegt", "unbekannt", "mitte"] as const).map((id, index) => {
        const item = copy.missions.items.find((mission) => mission.id === id);
        return (
          <Slot
            key={id}
            open={checklist.openId === id || Boolean(checklist.done[id])}
            done={Boolean(checklist.done[id])}
            title={`${index + 1}. ${item?.title ?? id}`}
            prompt={item?.task ?? ""}
            chosen={choice[id]}
            choices={[...CHOICES[id]]}
            note={note[id]}
            success={fillCopy(copy.texts.hit ?? "", { title: item?.title ?? "" })}
            onPick={(value) => pick(id, value)}
            onVerify={() => verify(id)}
          />
        );
      })}

      {checklist.allDone ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
          <h3 className="font-heading text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            Die Karte auf /map stimmt.
          </h3>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{copy.texts.ok}</p>
          {nextHref ? (
            <div className="mt-4">
              <Link
                href={nextHref}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Zur nächsten Lektion <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Slot({
  open,
  done,
  title,
  prompt,
  chosen,
  choices,
  note,
  success,
  onPick,
  onVerify,
}: {
  open: boolean;
  done: boolean;
  title: string;
  prompt: string;
  chosen: string;
  choices: string[];
  note: string;
  success: string;
  onPick: (value: string) => void;
  onVerify: () => void;
}) {
  return (
    <section
      className={`rounded-xl bg-card p-4 ring-1 ring-foreground/10 ${open ? "" : "opacity-50"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-heading">{title}</h3>
        {done ? (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" /> Gelöst
          </span>
        ) : null}
      </div>
      <p className="mb-3 text-sm leading-6">{prompt}</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={chosen === item ? "default" : "outline"}
            aria-pressed={chosen === item}
            disabled={done || !open}
            className={
              chosen === item
                ? "bg-heading text-background hover:bg-heading hover:text-background"
                : "border-border bg-transparent text-foreground"
            }
            onClick={() => onPick(item)}
          >
            {item}
          </Button>
        ))}
        {done || !open ? null : (
          <Button type="button" size="sm" variant="default" onClick={onVerify}>
            Überprüfen
          </Button>
        )}
      </div>
      {done ? <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">{success}</p> : null}
      {note ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{note}</span>
        </p>
      ) : null}
    </section>
  );
}

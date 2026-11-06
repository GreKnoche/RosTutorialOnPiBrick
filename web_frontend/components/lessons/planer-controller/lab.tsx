"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import {
  CmdBeat,
  CurveBeat,
  LookaheadBeat,
  PathBeat,
  RotateBeat,
} from "@/components/lessons/planer-controller/scenes";
import { MissionBoard } from "@/components/mission-board";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import type { LessonCopy } from "@/lib/lesson-copy";

const SLOTS = ["slot_cmd", "slot_lookahead", "slot_curve"] as const;
type SlotId = (typeof SLOTS)[number];

const CHOICES: Record<SlotId, string[]> = {
  slot_cmd: ["/cmd_vel", "{path}", "Costmap", "Tick"],
  slot_lookahead: ["0.12 m", "0.18 m", "0.22 m", "0.35 m"],
  slot_curve: ["0 m/s", "0.04 m/s", "0.06 m/s", "0.12 m/s"],
};

const EXPECTED: Record<SlotId, string> = {
  slot_cmd: "/cmd_vel",
  slot_lookahead: "0.18 m",
  slot_curve: "0.06 m/s",
};

export function PlanerControllerLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  useMissionRun({ track: "nav2", lessonId: "05", allDone: checklist.allDone });

  const [choice, setChoice] = useState<Record<SlotId, string>>({
    slot_cmd: "",
    slot_lookahead: "",
    slot_curve: "",
  });
  const [note, setNote] = useState<Record<SlotId, string>>({
    slot_cmd: "",
    slot_lookahead: "",
    slot_curve: "",
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
    const wrong =
      id === "slot_cmd"
        ? copy.texts.cmd_wrong
        : id === "slot_lookahead"
          ? copy.texts.lookahead_wrong
          : copy.texts.curve_wrong;
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
      <CopySection copy={copy} id="planer">
        <PathBeat />
      </CopySection>
      <CopySection copy={copy} id="controller">
        <CmdBeat />
      </CopySection>
      <CopySection copy={copy} id="voraus">
        <LookaheadBeat />
      </CopySection>
      <CopySection copy={copy} id="drehen">
        <RotateBeat />
      </CopySection>
      <CopySection copy={copy} id="kurve">
        <CurveBeat />
      </CopySection>
      <CopySection copy={copy} id="dateien" />

      <MissionBoard intro={copy.missions.intro} missions={missions} />
      {checklist.allDone ? null : (
        <p className="font-mono text-xs text-muted-foreground">
          Aufgabe {checklist.index} / {missionIds.length}
        </p>
      )}

      <Slot
        open={checklist.openId === "slot_cmd" || Boolean(checklist.done.slot_cmd)}
        done={Boolean(checklist.done.slot_cmd)}
        title="1. Ausgabe von FollowPath"
        prompt="Der Pfad liegt auf dem Blackboard. Was gibt FollowPath zwanzigmal pro Sekunde aus?"
        chosen={choice.slot_cmd}
        choices={CHOICES.slot_cmd}
        note={note.slot_cmd}
        onPick={(value) => pick("slot_cmd", value)}
        onVerify={() => verify("slot_cmd")}
      />
      <Slot
        open={checklist.openId === "slot_lookahead" || Boolean(checklist.done.slot_lookahead)}
        done={Boolean(checklist.done.slot_lookahead)}
        title="2. Vorausschau bei 0.12 m/s"
        prompt="Die aktuelle Vorwärtsgeschwindigkeit ist 0.12 m/s. Welche Lookahead-Distanz gilt?"
        chosen={choice.slot_lookahead}
        choices={CHOICES.slot_lookahead}
        note={note.slot_lookahead}
        onPick={(value) => pick("slot_lookahead", value)}
        onVerify={() => verify("slot_lookahead")}
      />
      <Slot
        open={checklist.openId === "slot_curve" || Boolean(checklist.done.slot_curve)}
        done={Boolean(checklist.done.slot_curve)}
        title="3. Kurve mit kleinem Winkel"
        prompt="Der Winkel zum Lookahead ist 0.2 rad. Der Radius ist 0.06 m. Der Restweg ist länger als 0.25 m. Welche Vorwärtsgeschwindigkeit setzt der Regler?"
        chosen={choice.slot_curve}
        choices={CHOICES.slot_curve}
        note={note.slot_curve}
        onPick={(value) => pick("slot_curve", value)}
        onVerify={() => verify("slot_curve")}
      />

      {checklist.allDone ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
          <h3 className="font-heading text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            Pfad und Fahrt passen zusammen.
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
      {note ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{note}</span>
        </p>
      ) : null}
    </section>
  );
}

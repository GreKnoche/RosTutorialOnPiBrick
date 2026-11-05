"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { BlattBeat, LeitungBeat, PluginBeat, ServerBeat } from "@/components/lessons/plugins/scenes";
import { MissionBoard } from "@/components/mission-board";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import type { LessonCopy } from "@/lib/lesson-copy";

const PLANNER = "nav2_navfn_planner::NavfnPlanner";
const CONTROLLER = "nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController";

const PLANNER_CHOICES = [
  PLANNER,
  CONTROLLER,
  "nav2_bt_navigator::NavigateToPoseNavigator",
  "nav2_controller::SimpleGoalChecker",
];

const CONTROLLER_CHOICES = [
  CONTROLLER,
  PLANNER,
  "nav2_controller::SimpleProgressChecker",
  "nav2_bt_navigator::NavigateToPoseNavigator",
];

const PATH_CHOICES = ["path", "goal", "selected_planner", "selected_controller"];

export function PluginsLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  useMissionRun({ track: "nav2", lessonId: "04", allDone: checklist.allDone });

  const [choice, setChoice] = useState({ slot_planner: "", slot_controller: "", slot_path: "" });
  const [note, setNote] = useState({ slot_planner: "", slot_controller: "", slot_path: "" });

  const pick = (id: "slot_planner" | "slot_controller" | "slot_path", value: string) => {
    setChoice((current) => ({ ...current, [id]: value }));
    setNote((current) => ({ ...current, [id]: "" }));
  };

  const verify = (id: "slot_planner" | "slot_controller" | "slot_path") => {
    const value = choice[id];
    if (!value) {
      setNote((current) => ({ ...current, [id]: "Wähle zuerst einen Eintrag." }));
      return;
    }
    const expected = id === "slot_planner" ? PLANNER : id === "slot_controller" ? CONTROLLER : "path";
    const wrong =
      id === "slot_planner"
        ? copy.texts.planner_wrong
        : id === "slot_controller"
          ? copy.texts.controller_wrong
          : copy.texts.path_wrong;
    if (value === expected) {
      checklist.mark(id);
      setNote((current) => ({ ...current, [id]: "" }));
      return;
    }
    setNote((current) => ({ ...current, [id]: wrong ?? "Diese Zuordnung passt nicht." }));
  };

  const missions = copy.missions.items.map((item) => ({
    id: item.id,
    title: item.title,
    hint: item.hint,
    done: Boolean(checklist.done[item.id]),
  }));

  return (
    <div className="flex flex-col gap-6">
      <CopySection copy={copy} id="blatt">
        <BlattBeat />
      </CopySection>
      <CopySection copy={copy} id="server">
        <ServerBeat />
      </CopySection>
      <CopySection copy={copy} id="plugin">
        <PluginBeat />
      </CopySection>
      <CopySection copy={copy} id="leitung">
        <LeitungBeat />
      </CopySection>

      <MissionBoard intro={copy.missions.intro} missions={missions} />

      <Slot
        open={checklist.openId === "slot_planner" || Boolean(checklist.done.slot_planner)}
        done={Boolean(checklist.done.slot_planner)}
        title="1. Klasse hinter ComputePathToPose"
        prompt="planner_plugins nennt den Namen GridBased. Welche Klasse lädt der planner_server darunter?"
        chosen={choice.slot_planner}
        choices={PLANNER_CHOICES}
        note={note.slot_planner}
        onPick={(value) => pick("slot_planner", value)}
        onVerify={() => verify("slot_planner")}
      />
      <Slot
        open={checklist.openId === "slot_controller" || Boolean(checklist.done.slot_controller)}
        done={Boolean(checklist.done.slot_controller)}
        title="2. Klasse hinter FollowPath"
        prompt="controller_plugins nennt den Namen FollowPath. Welche Klasse lädt der controller_server darunter?"
        chosen={choice.slot_controller}
        choices={CONTROLLER_CHOICES}
        note={note.slot_controller}
        onPick={(value) => pick("slot_controller", value)}
        onVerify={() => verify("slot_controller")}
      />
      <Slot
        open={checklist.openId === "slot_path" || Boolean(checklist.done.slot_path)}
        done={Boolean(checklist.done.slot_path)}
        title="3. Leitung zwischen den Blättern"
        prompt="ComputePathToPose schreibt ein Ergebnis. FollowPath liest dasselbe Feld. Welcher Blackboard-Schlüssel ist das?"
        chosen={choice.slot_path}
        choices={PATH_CHOICES}
        note={note.slot_path}
        onPick={(value) => pick("slot_path", value)}
        onVerify={() => verify("slot_path")}
      />

      {checklist.allDone ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
          <h3 className="font-heading text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            Die Module sind verbunden.
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
            disabled={done || !open}
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

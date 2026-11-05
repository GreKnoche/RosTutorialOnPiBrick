"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { FahrbaumBeat, RecoveryBeat, SequenzenBeat, TickStatusBeat } from "@/components/lessons/bt2/scenes";
import { MissionBoard } from "@/components/mission-board";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import type { LessonCopy } from "@/lib/lesson-copy";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

type SlotOptions = {
  [key: string]: string;
};

export function Bt2Lab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "03", allDone: checklist.allDone });

  const [selectedNodes, setSelectedNodes] = useState<SlotOptions>({
    slot_pipeline: "",
    slot_recovery: "",
    slot_reactive: "",
  });

  const [slotFeedback, setSlotFeedback] = useState<{
    [key: string]: { status: "idle" | "success" | "error"; text: string };
  }>({
    slot_pipeline: { status: "idle", text: "" },
    slot_recovery: { status: "idle", text: "" },
    slot_reactive: { status: "idle", text: "" },
  });

  const currentOpenId = checklist.openId;
  const openMission = copy.missions.items.find((item) => item.id === currentOpenId);
  const currentIndex = checklist.allDone
    ? missionIds.length
    : missionIds.indexOf(currentOpenId ?? "") + 1;

  const handleSelect = (slotId: string, nodeName: string) => {
    setSelectedNodes((prev) => ({ ...prev, [slotId]: nodeName }));
    setSlotFeedback((prev) => ({ ...prev, [slotId]: { status: "idle", text: "" } }));
  };

  const handleVerify = (slotId: string) => {
    const chosen = selectedNodes[slotId];
    if (!chosen) {
      setSlotFeedback((prev) => ({
        ...prev,
        [slotId]: { status: "error", text: "Wähle zuerst einen Kontrollknoten für diese Stelle." },
      }));
      return;
    }

    if (slotId === "slot_pipeline") {
      if (chosen === "PipelineSequence") {
        checklist.mark("slot_pipeline");
        setSlotFeedback((prev) => ({
          ...prev,
          slot_pipeline: {
            status: "success",
            text: "Richtig! PipelineSequence hält ComputePathToPose aktiv, während FollowPath RUNNING meldet.",
          },
        }));
      } else {
        setSlotFeedback((prev) => ({
          ...prev,
          slot_pipeline: {
            status: "error",
            text: copy.texts.pipeline_wrong || "Hier gehört die PipelineSequence hin.",
          },
        }));
      }
    } else if (slotId === "slot_recovery") {
      if (chosen === "RecoveryNode") {
        checklist.mark("slot_recovery");
        setSlotFeedback((prev) => ({
          ...prev,
          slot_recovery: {
            status: "success",
            text: "Richtig! RecoveryNode fängt FAILURE des Hauptasts ab und startet den BackUp-Recovery-Ast.",
          },
        }));
      } else {
        setSlotFeedback((prev) => ({
          ...prev,
          slot_recovery: {
            status: "error",
            text: copy.texts.recovery_wrong || "Hier gehört der RecoveryNode hin.",
          },
        }));
      }
    } else if (slotId === "slot_reactive") {
      if (chosen === "ReactiveSequence") {
        checklist.mark("slot_reactive");
        setSlotFeedback((prev) => ({
          ...prev,
          slot_reactive: {
            status: "success",
            text: "Richtig! ReactiveSequence beginnt bei jedem Tick wieder mit der linken Prüfung (IsPathValid).",
          },
        }));
      } else {
        setSlotFeedback((prev) => ({
          ...prev,
          slot_reactive: {
            status: "error",
            text: copy.texts.reactive_wrong || "Hier gehört die ReactiveSequence hin.",
          },
        }));
      }
    }
  };

  const missionsForBoard = copy.missions.items.map((m) => ({
    id: m.id,
    title: m.title,
    hint: m.hint,
    done: Boolean(checklist.done[m.id]),
  }));

  return (
    <div className="relative flex flex-col gap-6">
      <CopySection copy={copy} id="tick_status">
        <TickStatusBeat />
      </CopySection>
      <CopySection copy={copy} id="sequenzen">
        <SequenzenBeat />
      </CopySection>
      <CopySection copy={copy} id="recovery">
        <RecoveryBeat />
      </CopySection>
      <CopySection copy={copy} id="fahrbaum">
        <FahrbaumBeat />
      </CopySection>

      <MissionBoard intro={copy.missions.intro} missions={missionsForBoard} />

      {/* Interactive Slot-Based Exercise Studio */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Kontrollfluss-Studio
            </span>
            <h3 className="font-heading text-lg font-semibold text-heading">
              {openMission?.title || "Nav2 Kontrollknoten einsetzen"}
            </h3>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            Aufgabe {Math.min(currentIndex, 3)} / 3
          </span>
        </div>

        {/* Slot 1: PipelineSequence */}
        <section
          className={`mb-6 rounded-lg border p-4 transition-all ${
            currentOpenId === "slot_pipeline"
              ? "border-primary bg-primary/5"
              : checklist.done["slot_pipeline"]
              ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
              : "border-border opacity-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">1. Hauptast für Planung & Pfadverfolgung</span>
            {checklist.done["slot_pipeline"] && (
              <span className="flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Gelöst
              </span>
            )}
          </div>

          <div className="bg-[#0f172a] rounded-lg p-4 font-mono text-xs sm:text-sm text-slate-200 mb-4 border border-slate-800">
            <div className="text-amber-400 mb-2 font-sans font-medium text-xs">
              Ziel: ComputePathToPose (Planerfrequenz 5.0 Hz) soll neu planen, während FollowPath RUNNING ist.
            </div>
            <div className="pl-2 border-l-2 border-slate-700">
              <span className="text-sky-400 font-bold">
                {selectedNodes.slot_pipeline ? `<${selectedNodes.slot_pipeline}>` : "<[ Freie Stelle: Kontrollknoten ]>"}
              </span>
              <div className="pl-6 border-l border-slate-800 my-1">
                &lt;ComputePathToPose goal=&#123;goal&#125; path=&#123;path&#125; /&gt;
              </div>
              <div className="pl-6 border-l border-slate-800 my-1">
                &lt;FollowPath path=&#123;path&#125; /&gt;
              </div>
              <span className="text-sky-400 font-bold">
                {selectedNodes.slot_pipeline ? `</${selectedNodes.slot_pipeline}>` : "</[ ? ]>"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground mr-2">Knoten wählen:</span>
            {["Sequence", "PipelineSequence", "ReactiveSequence", "Fallback"].map((node) => (
              <Button
                key={node}
                size="sm"
                variant={selectedNodes.slot_pipeline === node ? "default" : "outline"}
                aria-pressed={selectedNodes.slot_pipeline === node}
                disabled={Boolean(checklist.done["slot_pipeline"])}
                onClick={() => handleSelect("slot_pipeline", node)}
              >
                {node}
              </Button>
            ))}
            {!checklist.done["slot_pipeline"] && (
              <Button
                size="sm"
                variant="default"
                className="ml-auto"
                onClick={() => handleVerify("slot_pipeline")}
              >
                Überprüfen
              </Button>
            )}
          </div>

          {slotFeedback.slot_pipeline.text && (
            <div
              className={`text-xs p-2 rounded flex items-center gap-2 ${
                slotFeedback.slot_pipeline.status === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {slotFeedback.slot_pipeline.status === "success" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{slotFeedback.slot_pipeline.text}</span>
            </div>
          )}
        </section>

        {/* Slot 2: RecoveryNode */}
        <section
          className={`mb-6 rounded-lg border p-4 transition-all ${
            currentOpenId === "slot_recovery"
              ? "border-primary bg-primary/5"
              : checklist.done["slot_recovery"]
              ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
              : "border-border opacity-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">2. Wurzelknoten mit Fehlerbehandlung</span>
            {checklist.done["slot_recovery"] && (
              <span className="flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Gelöst
              </span>
            )}
          </div>

          <div className="bg-[#0f172a] rounded-lg p-4 font-mono text-xs sm:text-sm text-slate-200 mb-4 border border-slate-800">
            <div className="text-amber-400 mb-2 font-sans font-medium text-xs">
              Ziel: Scheitert die Fahr-Pipeline mit FAILURE, soll BackUp ausgeführt und der Hauptast bis zu 2-mal wiederholt werden.
            </div>
            <div className="pl-2 border-l-2 border-slate-700">
              <span className="text-amber-400 font-bold">
                {selectedNodes.slot_recovery ? `<${selectedNodes.slot_recovery} number_of_retries="2">` : "<[ Freie Stelle: Wurzelknoten ] number_of_retries=\"2\">"}
              </span>
              <div className="pl-6 border-l border-slate-800 my-1 text-slate-400">
                &lt;!-- Kind 1: Hauptast --&gt;
                <br />
                &lt;PipelineSequence&gt; ... &lt;/PipelineSequence&gt;
              </div>
              <div className="pl-6 border-l border-slate-800 my-1 text-slate-400">
                &lt;!-- Kind 2: Recovery-Ast --&gt;
                <br />
                &lt;BackUp backup_dist="0.15" /&gt;
              </div>
              <span className="text-amber-400 font-bold">
                {selectedNodes.slot_recovery ? `</${selectedNodes.slot_recovery}>` : "</[ ? ]>"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground mr-2">Knoten wählen:</span>
            {["RecoveryNode", "Sequence", "Fallback", "RoundRobin"].map((node) => (
              <Button
                key={node}
                size="sm"
                variant={selectedNodes.slot_recovery === node ? "default" : "outline"}
                aria-pressed={selectedNodes.slot_recovery === node}
                disabled={Boolean(checklist.done["slot_recovery"])}
                onClick={() => handleSelect("slot_recovery", node)}
              >
                {node}
              </Button>
            ))}
            {!checklist.done["slot_recovery"] && (
              <Button
                size="sm"
                variant="default"
                className="ml-auto"
                onClick={() => handleVerify("slot_recovery")}
              >
                Überprüfen
              </Button>
            )}
          </div>

          {slotFeedback.slot_recovery.text && (
            <div
              className={`text-xs p-2 rounded flex items-center gap-2 ${
                slotFeedback.slot_recovery.status === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {slotFeedback.slot_recovery.status === "success" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{slotFeedback.slot_recovery.text}</span>
            </div>
          )}
        </section>

        {/* Slot 3: ReactiveSequence */}
        <section
          className={`rounded-lg border p-4 transition-all ${
            currentOpenId === "slot_reactive"
              ? "border-primary bg-primary/5"
              : checklist.done["slot_reactive"]
              ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
              : "border-border opacity-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">3. Reaktive Überwachung bei jedem Tick</span>
            {checklist.done["slot_reactive"] && (
              <span className="flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Gelöst
              </span>
            )}
          </div>

          <div className="bg-[#0f172a] rounded-lg p-4 font-mono text-xs sm:text-sm text-slate-200 mb-4 border border-slate-800">
            <div className="text-amber-400 mb-2 font-sans font-medium text-xs">
              Ziel: Bevor FollowPath den nächsten Schritt fährt, muss die Prüfung IsPathValid bei jedem Tick erneut von links geprüft werden.
            </div>
            <div className="pl-2 border-l-2 border-slate-700">
              <span className="text-purple-400 font-bold">
                {selectedNodes.slot_reactive ? `<${selectedNodes.slot_reactive}>` : "<[ Freie Stelle: Kontrollknoten ]>"}
              </span>
              <div className="pl-6 border-l border-slate-800 my-1">
                &lt;IsPathValid path=&#123;path&#125; /&gt;
              </div>
              <div className="pl-6 border-l border-slate-800 my-1">
                &lt;FollowPath path=&#123;path&#125; /&gt;
              </div>
              <span className="text-purple-400 font-bold">
                {selectedNodes.slot_reactive ? `</${selectedNodes.slot_reactive}>` : "</[ ? ]>"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground mr-2">Knoten wählen:</span>
            {["Sequence", "ReactiveSequence", "PipelineSequence", "SequenceWithMemory"].map((node) => (
              <Button
                key={node}
                size="sm"
                variant={selectedNodes.slot_reactive === node ? "default" : "outline"}
                aria-pressed={selectedNodes.slot_reactive === node}
                disabled={Boolean(checklist.done["slot_reactive"])}
                onClick={() => handleSelect("slot_reactive", node)}
              >
                {node}
              </Button>
            ))}
            {!checklist.done["slot_reactive"] && (
              <Button
                size="sm"
                variant="default"
                className="ml-auto"
                onClick={() => handleVerify("slot_reactive")}
              >
                Überprüfen
              </Button>
            )}
          </div>

          {slotFeedback.slot_reactive.text && (
            <div
              className={`text-xs p-2 rounded flex items-center gap-2 ${
                slotFeedback.slot_reactive.status === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {slotFeedback.slot_reactive.status === "success" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{slotFeedback.slot_reactive.text}</span>
            </div>
          )}
        </section>
      </div>

      {/* Completion Overlay / Stamp */}
      {checklist.allDone && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
          <h4 className="font-heading text-lg font-bold text-emerald-700 dark:text-emerald-300">
            Hervorragend! Alle Kontrollknoten sitzen perfekt.
          </h4>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl mx-auto">
            {copy.texts.ok}
          </p>
          {nextHref && (
            <div className="mt-4">
              <Link
                href={nextHref}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Zur nächsten Lektion <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { LessonStudio } from "@/components/lessons/lesson-studio";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import { ScratchPad } from "@/components/scratch-pad";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { clamp, formatDe } from "@/lib/format";
import { driveWheels, hardwareNotice } from "@/lib/robot-drive";

const TARGET_M = 1;
const TOLERANCE_M = 0.02;
const DIAMETER_MIN = 2;
const DIAMETER_MAX = 12;
const CIRCUMFERENCE_MIN = 8;
const CIRCUMFERENCE_MAX = 40;
const START_DIAMETER_CM = 5.54;
const FORMULA_SYNC_CM = 1;
const THEORY_CIRCUMFERENCE_CM = 17.4;
const THEORY_MATCH_CM = 0.05;
const MIN_REVOLUTIONS = 2.5;
const REVOLUTION_MATCH = 0.05;

export function RadumfangLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "autonom", lessonId: "01", allDone: checklist.allDone });
  const [diameterCm, setDiameterCm] = useState(START_DIAMETER_CM);
  const [resultCm, setResultCm] = useState<number | null>(null);
  const [helperDenom, setHelperDenom] = useState("");
  const [circumferenceCm, setCircumferenceCm] = useState(() =>
    circumferenceFromDiameter(START_DIAMETER_CM),
  );
  const [revolutions, setRevolutions] = useState(1);
  const [distanceM, setDistanceM] = useState(0);
  const [hardwareNote, setHardwareNote] = useState<string | null>(null);
  const driveToken = useRef(0);

  const radiusCm = diameterCm / 2;
  const hit = Math.abs(distanceM - TARGET_M) <= TOLERANCE_M;
  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const missionKind = classifyMission(
    circumferenceCm,
    revolutions,
    Boolean(checklist.done.theory),
  );
  const drive = copy.sections["ruler-drive"];
  const feedback = !run.session.finished
    ? copy.texts.idle
    : !hit
      ? distanceM < TARGET_M
        ? copy.texts.short
        : copy.texts.long
      : missionKind && missionKind === open?.id
        ? fillCopy(copy.texts.hit, { title: open.title })
        : open?.id === "theory"
          ? copy.texts["theory-needed"]
          : copy.texts["other-needed"];

  return (
    <>
      <CopySection copy={copy} id="circumference-calc">
        <label htmlFor="durchmesser" className="grid max-w-xs gap-2 text-sm">
          <span className="flex items-center justify-between gap-3">
            <span className="font-medium text-heading">Durchmesser</span>
            <span className="flex items-center gap-1">
              <input
                id="durchmesser"
                type="number"
                min={DIAMETER_MIN}
                max={DIAMETER_MAX}
                step={0.01}
                value={diameterCm}
                disabled={run.session.running}
                onChange={(event) => {
                  const nextDiameter = clamp(
                    Number(event.target.value),
                    DIAMETER_MIN,
                    DIAMETER_MAX,
                    diameterCm,
                  );
                  const previous = circumferenceFromDiameter(diameterCm);
                  setDiameterCm(nextDiameter);
                  if (Math.abs(circumferenceCm - previous) <= FORMULA_SYNC_CM) {
                    setCircumferenceCm(circumferenceFromDiameter(nextDiameter));
                  }
                  setResultCm(null);
                  run.session.clearFinished();
                }}
                className="w-24 rounded-md bg-background px-2 py-1 text-right font-mono ring-1 ring-foreground/15"
              />
              <span className="text-xs text-muted-foreground">cm</span>
            </span>
          </span>
        </label>
        <p className="font-mono text-lg text-heading">
          U = π · {formatDe(diameterCm, 2)} = 2 · π · {formatDe(radiusCm, 2)}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            disabled={run.session.running}
            onClick={() => {
              const next = circumferenceFromDiameter(diameterCm);
              setResultCm(next);
              setCircumferenceCm(next);
              run.session.clearFinished();
            }}
          >
            Berechnen
          </Button>
          {resultCm !== null && (
            <p className="font-mono text-3xl text-heading">{formatDe(resultCm, 2)} cm</p>
          )}
        </div>
      </CopySection>

      <CopySection copy={copy} id="real-calibration" />

      <LessonStudio
        id="ruler-drive-title"
        eyebrow={drive?.eyebrow ?? ""}
        title={drive?.title ?? ""}
        boardIntro={copy.missions.intro}
        missions={copy.missions.items.map((item) => ({
          ...item,
          done: Boolean(checklist.done[item.id]),
        }))}
        lessonId="radumfang"
        ruler={{
          circumferenceCm,
          revolutions,
          runId: run.session.runId,
          resetId: run.session.resetId,
          onDistance: setDistanceM,
          onDone: (meters) => {
            setDistanceM(meters);
            run.session.finish();
            if (Math.abs(meters - TARGET_M) > TOLERANCE_M) return;
            const next = copy.missions.items.find((item) => item.id === checklist.openId);
            const kind = classifyMission(
              circumferenceCm,
              revolutions,
              Boolean(checklist.done.theory),
            );
            if (!next || kind !== next.id) return;
            checklist.mark(next.id);
            run.succeed(next.title);
          },
        }}
        stampHref={nextHref}
        allDone={checklist.allDone}
        banner={run.banner}
        missionIndex={checklist.index}
        missionTotal={copy.missions.items.length}
        task={open?.task ?? ""}
        successTitle={run.doneTitle}
        onBannerNext={() => run.setBanner(run.banner === "success" ? "task" : "hidden")}
        onRestart={() => {
          driveToken.current += 1;
          setHardwareNote(null);
          setDistanceM(0);
          checklist.reset();
          run.restart();
        }}
        running={run.session.running}
        driveDisabled={run.bannerUp}
        onDrive={() => {
          const token = driveToken.current + 1;
          driveToken.current = token;
          setHardwareNote(null);
          setDistanceM(0);
          run.session.drive();
          void driveWheels(revolutions, revolutions).then((result) => {
            if (driveToken.current !== token) return;
            if (!result.ok) setHardwareNote(hardwareNotice(result.message));
          });
        }}
        onReset={() => {
          driveToken.current += 1;
          setHardwareNote(null);
          setDistanceM(0);
          run.session.reset();
        }}
        feedback={feedback}
        feedbackOk={run.session.finished && hit}
        notice={hardwareNote}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="radumfang"
            label="Radumfang"
            unit="cm"
            min={CIRCUMFERENCE_MIN}
            max={CIRCUMFERENCE_MAX}
            step={0.01}
            value={circumferenceCm}
            disabled={run.session.running}
            onChange={(value) => {
              setCircumferenceCm(value);
              run.session.clearFinished();
            }}
          />
          <NumberControl
            id="umdrehungen"
            label="Umdrehungen"
            min={1}
            max={20}
            step={0.01}
            value={revolutions}
            disabled={run.session.running}
            onChange={(value) => {
              setRevolutions(value);
              run.session.clearFinished();
            }}
          />
        </div>
      </LessonStudio>

      <CopySection copy={copy} id="revolutions-calc">
        <ScratchPad
          numerator="100 cm"
          ariaLabel="Radumfang in Zentimeter"
          value={helperDenom}
          onChange={setHelperDenom}
          compute={(denom) => 100 / denom}
        />
      </CopySection>
    </>
  );
}

function classifyMission(
  circumferenceCm: number,
  revolutions: number,
  theoryDone: boolean,
): string | null {
  const theory = Math.abs(circumferenceCm - THEORY_CIRCUMFERENCE_CM) <= THEORY_MATCH_CM;
  const few = Math.abs(revolutions - MIN_REVOLUTIONS) <= REVOLUTION_MATCH;
  if (!theoryDone) return theory ? "theory" : null;
  return few ? "other" : null;
}

function circumferenceFromDiameter(diameterCm: number) {
  return clamp(Number((diameterCm * Math.PI).toFixed(2)), CIRCUMFERENCE_MIN, CIRCUMFERENCE_MAX, 17.4);
}

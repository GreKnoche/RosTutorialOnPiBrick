"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { LessonStudio } from "@/components/lessons/lesson-studio";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import { ScratchPad } from "@/components/scratch-pad";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { clamp, formatDe } from "@/lib/format";

const TARGET_RAD = Math.PI / 2;
const TOLERANCE_RAD = (3 * Math.PI) / 180;
const SEPARATION_MIN = 6;
const SEPARATION_MAX = 25;
const START_SEPARATION_CM = 11.8;
const PATH_MIN = -45;
const PATH_MAX = 45;
const START_LEFT_PATH_CM = 0;
const START_RIGHT_PATH_CM = 10;
const ZERO_CM = 0.05;

export function RadabstandLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "autonom", lessonId: "02", allDone: checklist.allDone });
  const [measuredCm, setMeasuredCm] = useState(START_SEPARATION_CM);
  const [resultCm, setResultCm] = useState<number | null>(null);
  const [helperL, setHelperL] = useState("");
  const [separationCm, setSeparationCm] = useState(START_SEPARATION_CM);
  const [leftPathCm, setLeftPathCm] = useState(START_LEFT_PATH_CM);
  const [rightPathCm, setRightPathCm] = useState(START_RIGHT_PATH_CM);
  const [headingRad, setHeadingRad] = useState(0);

  const headingDeg = (headingRad * 180) / Math.PI;
  const hit = Math.abs(headingRad - TARGET_RAD) <= TOLERANCE_RAD;
  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const missionKind = classifyMission(leftPathCm, rightPathCm);
  const drive = copy.sections["protractor-drive"];
  const feedback = !run.session.finished
    ? copy.texts.idle
    : !hit
      ? headingDeg < 90
        ? copy.texts.short
        : copy.texts.long
      : missionKind && missionKind === open?.id
        ? fillCopy(copy.texts.hit, { title: open.title })
        : open
          ? fillCopy(copy.texts.wrong, { title: open.title })
          : copy.texts.none;

  return (
    <>
      <CopySection copy={copy} id="separation-calc">
        <label htmlFor="radabstand" className="grid max-w-xs gap-2 text-sm">
          <span className="flex items-center justify-between gap-3">
            <span className="font-medium text-heading">Radabstand</span>
            <span className="flex items-center gap-1">
              <input
                id="radabstand"
                type="number"
                min={SEPARATION_MIN}
                max={SEPARATION_MAX}
                step={0.01}
                value={measuredCm}
                disabled={run.session.running}
                onChange={(event) => {
                  setMeasuredCm(
                    clamp(Number(event.target.value), SEPARATION_MIN, SEPARATION_MAX, measuredCm),
                  );
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
          Δθ = (s<sub>r</sub> − s<sub>l</sub>) / {formatDe(measuredCm, 2)}
        </p>
        <p className="font-mono text-lg text-heading">
          s<sub>r</sub> − s<sub>l</sub> = L · π / 2 = {formatDe(measuredCm, 2)} · π / 2
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            disabled={run.session.running}
            onClick={() => {
              const next = arcFromSeparation(measuredCm);
              setResultCm(next);
              setSeparationCm(next > 0 ? measuredCm : separationCm);
              run.session.clearFinished();
            }}
          >
            Berechnen
          </Button>
          {resultCm !== null && (
            <p className="font-mono text-3xl text-heading">{formatDe(resultCm, 2)} cm</p>
          )}
        </div>
        {resultCm !== null && copy.texts["arc-result"] ? (
          <MarkdownBlock source={copy.texts["arc-result"]} />
        ) : null}
      </CopySection>

      <CopySection copy={copy} id="turn-calibration" />

      <LessonStudio
        id="protractor-drive-title"
        eyebrow={drive?.eyebrow ?? ""}
        title={drive?.title ?? ""}
        boardIntro={copy.missions.intro}
        missions={copy.missions.items.map((item) => ({
          ...item,
          done: Boolean(checklist.done[item.id]),
        }))}
        lessonId="radabstand"
        turn={{
          separationCm,
          leftPathCm,
          rightPathCm,
          runId: run.session.runId,
          resetId: run.session.resetId,
          onHeading: setHeadingRad,
          onDone: (radians) => {
            setHeadingRad(radians);
            run.session.finish();
            if (Math.abs(radians - TARGET_RAD) > TOLERANCE_RAD) return;
            const next = copy.missions.items.find((item) => item.id === checklist.openId);
            const kind = classifyMission(leftPathCm, rightPathCm);
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
          setHeadingRad(0);
          checklist.reset();
          run.restart();
        }}
        running={run.session.running}
        driveDisabled={run.bannerUp}
        onDrive={() => {
          setHeadingRad(0);
          run.session.drive();
        }}
        onReset={() => {
          setHeadingRad(0);
          run.session.reset();
        }}
        feedback={feedback}
        feedbackOk={run.session.finished && hit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="turn-radabstand"
            label="Radabstand"
            unit="cm"
            min={SEPARATION_MIN}
            max={SEPARATION_MAX}
            step={0.01}
            value={separationCm}
            disabled={run.session.running}
            onChange={(value) => {
              setSeparationCm(value);
              run.session.clearFinished();
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="linkes-rad"
            label="Linkes Rad fährt"
            unit="cm"
            min={PATH_MIN}
            max={PATH_MAX}
            step={0.01}
            value={leftPathCm}
            disabled={run.session.running}
            onChange={(value) => {
              setLeftPathCm(value);
              run.session.clearFinished();
            }}
          />
          <NumberControl
            id="rechtes-rad"
            label="Rechtes Rad fährt"
            unit="cm"
            min={PATH_MIN}
            max={PATH_MAX}
            step={0.01}
            value={rightPathCm}
            disabled={run.session.running}
            onChange={(value) => {
              setRightPathCm(value);
              run.session.clearFinished();
            }}
          />
        </div>
        {copy.texts["zero-note"] ? (
          <p className="text-xs text-muted-foreground">{copy.texts["zero-note"]}</p>
        ) : null}
      </LessonStudio>

      <CopySection copy={copy} id="arc-calc">
        <ScratchPad
          numerator="L · π / 2"
          ariaLabel="Radabstand in Zentimeter"
          value={helperL}
          onChange={setHelperL}
          compute={(length) => (length * Math.PI) / 2}
        />
      </CopySection>
    </>
  );
}

function classifyMission(leftCm: number, rightCm: number): string | null {
  const leftZero = Math.abs(leftCm) <= ZERO_CM;
  const rightZero = Math.abs(rightCm) <= ZERO_CM;
  if (leftZero && rightZero) return null;
  if (leftZero !== rightZero) return "pivot";
  if (leftCm * rightCm < 0) return "opposite";
  if (leftCm * rightCm > 0) return "same";
  return null;
}

function arcFromSeparation(separationCm: number) {
  return Number(((separationCm * Math.PI) / 2).toFixed(2));
}

"use client";

import { useMemo, useState } from "react";
import { CopySection } from "@/components/lessons/copy-section";
import { LessonStudio } from "@/components/lessons/lesson-studio";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { useMissionRun } from "@/components/lessons/use-mission-run";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import type { LessonLevel } from "@/lib/lesson-levels";
import { formatDe } from "@/lib/format";
import {
  formatGoalLabel,
  goalsToPoses,
  headingSteps,
  labDone,
  ODOM_LABS,
  orderedGoalFlags,
  parseWheelProgram,
  segmentsToCm,
  turnRevs,
} from "@/lib/pseudo-path";
import type { Pose2D } from "@/lib/ev3-core";

const DEFAULT_U = 17.4;
const DEFAULT_L = 11.8;

const DEFAULT_PROGRAM = `# Maße aus Lektion 1 und 2
Radumfang 17.4
Radabstand 11.8

# geradeaus, gleiche Umdrehungen
links 1.38
rechts 1.38

# drehen, ein Rad hält
# links 0
# rechts 1.07`;

const ORIGIN: Pose2D = { x: 0, y: 0, theta: 0 };

export function OdometrieLab({
  copy,
  nextHref,
  level = "beginner",
}: {
  copy: LessonCopy;
  nextHref?: string;
  level?: LessonLevel;
}) {
  const [source, setSource] = useState(DEFAULT_PROGRAM);
  const [labIndex, setLabIndex] = useState(0);
  const [trail, setTrail] = useState<Pose2D[]>([ORIGIN]);
  const [cleared, setCleared] = useState(false);
  const spec = ODOM_LABS[labIndex] ?? ODOM_LABS[0];
  const mission = copy.missions.items.find((item) => item.id === spec.id) ?? copy.missions.items[labIndex];
  const lastLab = labIndex >= ODOM_LABS.length - 1;
  const allDone = lastLab && cleared;
  const run = useMissionRun({ track: "autonom", lessonId: "03", allDone });
  const program = useMemo(() => parseWheelProgram(source), [source]);
  const circumferenceCm = program.circumferenceCm ?? DEFAULT_U;
  const separationCm = program.separationCm ?? DEFAULT_L;
  const hits = orderedGoalFlags(trail, spec.goalsCm);
  const steps = headingSteps(spec.goalsCm);
  const showHelpers = level === "beginner";
  const drive = copy.sections["odometry-path"];
  const angle = copy.sections.angle;
  const feedback = program.error
    ? program.error
    : !run.session.finished
      ? copy.texts.idle
      : copy.texts.missed;

  function advanceLab() {
    setCleared(false);
    setLabIndex((index) => Math.min(index + 1, ODOM_LABS.length - 1));
    setTrail([ORIGIN]);
    run.session.reset();
  }

  return (
    <>
      <CopySection copy={copy} id="odometry-formula">
        <p className="font-mono text-lg text-heading">s = n · U</p>
        <p className="font-mono text-lg text-heading">
          Δθ = (s<sub>r</sub> − s<sub>l</sub>) / L
        </p>
        <p className="font-mono text-lg text-heading">90°, ein Rad hält: n = (L · π / 2) / U</p>
      </CopySection>

      <LessonStudio
        id="odometry-path-title"
        eyebrow={drive?.eyebrow ?? ""}
        title={drive?.title ?? ""}
        boardIntro={fillCopy(copy.missions.intro, {
          index: labIndex + 1,
          total: ODOM_LABS.length,
        })}
        missions={
          mission
            ? [{ id: mission.id, title: mission.title, hint: mission.hint, done: cleared }]
            : []
        }
        lessonId="odometrie"
        path={{
          circumferenceCm,
          separationCm,
          segments: program.error ? [] : segmentsToCm(program.segments, circumferenceCm),
          waypoints: goalsToPoses(spec.goalsCm),
          hits,
          runId: run.session.runId,
          resetId: run.session.resetId,
          onPose: (next) => {
            setTrail((current) => {
              const last = current[current.length - 1];
              if (last && Math.hypot(last.x - next.x, last.y - next.y) < 0.004) return current;
              return [...current, next];
            });
          },
          onDone: (_next, nextTrail) => {
            const used = nextTrail.length > 0 ? nextTrail : [ORIGIN];
            setTrail(used);
            run.session.finish();
            if (cleared || !spec || !labDone(spec.id, used)) return;
            setCleared(true);
            run.succeed(mission?.title ?? "");
          },
        }}
        stampHref={nextHref}
        allDone={allDone}
        banner={run.banner}
        missionIndex={labIndex + 1}
        missionTotal={ODOM_LABS.length}
        task={mission?.title ?? ""}
        successTitle={run.banner === "success" ? (mission?.title ?? null) : null}
        onBannerNext={() => {
          if (run.banner === "success") {
            if (!lastLab) advanceLab();
            run.setBanner("task");
          } else {
            run.setBanner("hidden");
          }
        }}
        onRestart={() => {
          setLabIndex(0);
          setCleared(false);
          setTrail([ORIGIN]);
          run.restart();
        }}
        running={run.session.running}
        driveDisabled={run.bannerUp || Boolean(program.error) || program.segments.length === 0}
        onDrive={() => {
          setTrail([ORIGIN]);
          run.session.drive();
        }}
        onReset={() => {
          setTrail([ORIGIN]);
          run.session.reset();
        }}
        feedback={feedback}
        showFeedback={Boolean(program.error) || !cleared}
        before={
          <ul className="font-mono text-sm leading-6 text-heading">
            {spec.goalsCm.map((point, index) => (
              <li key={`${spec.id}-${index}`}>
                {index + 1} · {formatGoalLabel(point)}
              </li>
            ))}
          </ul>
        }
      >
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {angle?.eyebrow}
          </p>
          {angle?.body ? <MarkdownBlock source={angle.body} className="mt-1" /> : null}
          <ul className="mt-2 font-mono text-sm leading-6 text-heading">
            {steps.map((step) => (
              <li key={`${spec.id}-${step.from}-${step.to}`}>
                {step.from} → {step.to} · {formatSigned(step.degrees, 1)}° ·{" "}
                {pivotNote(
                  step.degrees,
                  program.separationCm,
                  program.circumferenceCm,
                  copy,
                  showHelpers,
                )}
              </li>
            ))}
          </ul>
        </div>

        {showHelpers ? (
          <>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-heading">{copy.texts.pseudocode}</span>
              <textarea
                aria-label={copy.texts.pseudocode}
                value={source}
                disabled={run.session.running}
                spellCheck={false}
                onChange={(event) => {
                  setSource(event.target.value);
                  run.session.clearFinished();
                }}
                className="min-h-52 w-full resize-y rounded-md bg-background px-3 py-2 font-mono text-[0.65rem] leading-5 ring-1 ring-foreground/15"
              />
            </label>
            <p className="text-sm leading-6">
              {program.separationCm === null || program.circumferenceCm === null
                ? copy.texts["missing-measures"]
                : fillCopy(copy.texts["turn-revs"], {
                    revs: formatDe(turnRevs(program.separationCm, program.circumferenceCm), 2),
                  })}
            </p>
          </>
        ) : null}
      </LessonStudio>
    </>
  );
}

function formatSigned(value: number, digits: number) {
  const text = formatDe(value, digits);
  if (value > 0) return `+${text}`;
  return text;
}

function pivotNote(
  degrees: number,
  separationCm: number | null,
  circumferenceCm: number | null,
  copy: LessonCopy,
  withRevs: boolean,
) {
  if (Math.abs(degrees) < 0.05) return copy.texts.straight;
  const left = degrees > 0;
  if (!withRevs || separationCm === null || circumferenceCm === null || circumferenceCm <= 0) {
    return left ? copy.texts["turn-left"] : copy.texts["turn-right"];
  }
  const revs = formatDe(
    (separationCm * Math.abs((degrees * Math.PI) / 180)) / circumferenceCm,
    2,
  );
  return fillCopy(left ? copy.texts["pivot-left"] : copy.texts["pivot-right"], { revs });
}

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard } from "@/components/mission-board";
import { RobotLab } from "@/components/robot-lab";
import { useDriveSession, useMarkLessonComplete } from "@/components/drive-session";
import { formatDe } from "@/lib/format";
import {
  classifyHits,
  formatGoalLabel,
  goalHitsAlongTrail,
  LESSON_GOALS_CM,
  LESSON_GOALS_M,
  parseWheelProgram,
  segmentsToCm,
  turnRevs,
  type MissionId,
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

const MISSIONS: { id: MissionId; title: string; hint: string }[] = [
  {
    id: "first",
    title: "Punkt 1",
    hint: "Fahre geradeaus zur ersten Scheibe. Beide Räder gleich viele Umdrehungen.",
  },
  {
    id: "all",
    title: "Alle Punkte",
    hint: "Drehe selbst und fahre die fünf Scheiben in der Reihenfolge 1 bis 5.",
  },
];

const ORIGIN: Pose2D = { x: 0, y: 0, theta: 0 };

export function OdometryPathDrive() {
  const [source, setSource] = useState(DEFAULT_PROGRAM);
  const [pose, setPose] = useState<Pose2D>(ORIGIN);
  const [trail, setTrail] = useState<Pose2D[]>([ORIGIN]);
  const [missions, setMissions] = useState<Record<MissionId, boolean>>({
    first: false,
    all: false,
  });
  const session = useDriveSession();

  const program = useMemo(() => parseWheelProgram(source), [source]);
  const circumferenceCm = program.circumferenceCm ?? DEFAULT_U;
  const separationCm = program.separationCm ?? DEFAULT_L;
  const hits = goalHitsAlongTrail(trail);
  const missionKind = session.finished ? classifyHits(trail) : null;
  const allDone = missions.first && missions.all;
  useMarkLessonComplete("autonom", "03", allDone);

  const feedback = program.error
    ? program.error
    : !session.finished
      ? "Setze Radumfang und Radabstand, dann links und rechts in Umdrehungen."
      : missionKind
        ? `Getroffen — Mission „${MISSIONS.find((mission) => mission.id === missionKind)?.title}“.`
        : "Die Fahrt ist durch, aber kein Ziel lag nah genug.";

  return (
    <>
      <LessonSection id="odometry-formula-title" eyebrow="Rechnung" title="Räder steuern die Pose">
        <p className="max-w-2xl text-sm leading-6">
          Die Scheiben liegen fest in der Fläche. Im Code setzt du zuerst Umfang und Radabstand,
          dann wie viele Umdrehungen jedes Rad macht. Gleiche Umdrehungen halten gerade. Ungleiche
          drehen: Die Wegdifferenz geteilt durch L ist der Winkel. Eine Umdrehung am Boden ist der
          Umfang, darum wird n mit U zur Strecke.
        </p>
        <p className="font-mono text-lg text-heading">s = n · U</p>
        <p className="font-mono text-lg text-heading">
          Δθ = (s<sub>r</sub> − s<sub>l</sub>) / L
        </p>
        <p className="font-mono text-lg text-heading">
          90°, ein Rad hält: n = (L · π / 2) / U
        </p>
      </LessonSection>

      <LessonSection id="odometry-path-title" eyebrow="Twin am Pfad" title="Feste Punkte, Umdrehungen im Code">
        <MissionBoard
          intro="Erst geradeaus zu Punkt 1, dann die ganze Runde."
          missions={MISSIONS.map((mission) => ({ ...mission, done: missions[mission.id] }))}
        />

        <ul className="font-mono text-sm leading-6 text-heading">
          {LESSON_GOALS_CM.map((point, index) => (
            <li key={`${point.x}-${point.y}`}>
              {index + 1} · {formatGoalLabel(point)}
            </li>
          ))}
        </ul>

        <RobotLab
          lab="none"
          lessonId="odometrie"
          showTopics={false}
          path={{
            circumferenceCm,
            separationCm,
            segments: program.error ? [] : segmentsToCm(program.segments, circumferenceCm),
            waypoints: LESSON_GOALS_M,
            hits,
            runId: session.runId,
            resetId: session.resetId,
            onPose: (next) => {
              setPose(next);
              setTrail((current) => {
                const last = current[current.length - 1];
                if (last && Math.hypot(last.x - next.x, last.y - next.y) < 0.004) return current;
                return [...current, next];
              });
            },
            onDone: (_next, nextTrail) => {
              const used = nextTrail.length > 0 ? nextTrail : [ORIGIN];
              setTrail(used);
              setPose(used[used.length - 1] ?? ORIGIN);
              session.finish();
              const kind = classifyHits(used);
              if (!kind) return;
              setMissions((current) => ({
                ...current,
                first: current.first || kind === "first" || kind === "all",
                all: current.all || kind === "all",
              }));
            },
          }}
        />

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-heading">Pseudocode</span>
          <textarea
            aria-label="Pseudocode"
            value={source}
            disabled={session.running}
            spellCheck={false}
            onChange={(event) => {
              setSource(event.target.value);
              session.clearFinished();
            }}
            className="min-h-52 w-full resize-y rounded-md bg-background px-3 py-2 font-mono text-sm leading-6 ring-1 ring-foreground/15"
          />
        </label>
        <p className="text-sm leading-6">
          {program.separationCm === null || program.circumferenceCm === null
            ? "Setze Radumfang und Radabstand, dann siehst du die Umdrehungen für 90°."
            : `Für 90° mit einem stehenden Rad ist n = (L · π / 2) / U = ${formatDe(turnRevs(program.separationCm, program.circumferenceCm), 2)} Umdrehungen.`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={session.running || Boolean(program.error) || program.segments.length === 0}
            onClick={() => {
              setTrail([ORIGIN]);
              setPose(ORIGIN);
              session.drive();
            }}
          >
            Fahren
          </Button>
          <Button
            type="button"
            onClick={() => {
              setPose(ORIGIN);
              setTrail([ORIGIN]);
              session.reset();
            }}
          >
            Zurücksetzen
          </Button>
          <p className="font-mono text-xs text-muted-foreground">
            Odometrie x={formatDe(pose.x * 100, 1)} cm · y={formatDe(pose.y * 100, 1)} cm · θ=
            {formatDe((pose.theta * 180) / Math.PI, 1)}°
          </p>
        </div>
        <p
          role="status"
          className={`text-sm leading-6 ${session.finished && missionKind ? "text-emerald-800" : ""}`}
        >
          {feedback}
          {session.finished && missionKind && allDone ? " Beide Missionen sind geschafft." : ""}
        </p>
      </LessonSection>
    </>
  );
}

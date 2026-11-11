"use client";

import { useEffect, useRef, useState } from "react";
import { LessonStudio } from "@/components/lessons/lesson-studio";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import { Button } from "@/components/ui/button";
import { formatDe } from "@/lib/format";
import { fillCopy, type LaborBlock, type LaborKind, type LessonCopy } from "@/lib/lesson-copy";
import type { Lesson } from "@/lib/types";

const TITLES: Record<LaborKind, { eyebrow: string; title: string }> = {
  gerade: { eyebrow: "Twin am Lineal", title: "Geradeaus fahren" },
  drehung: { eyebrow: "Twin am Winkelmesser", title: "Drehung fahren" },
  pfad: { eyebrow: "Twin am Pfad", title: "Pfad fahren" },
  teleop: { eyebrow: "Twin", title: "Frei fahren" },
  ziel: { eyebrow: "Twin", title: "Ziel anfahren" },
};

const IDLE: Record<LaborKind, string> = {
  gerade: "Stelle Umfang und Umdrehungen ein, dann fahre.",
  drehung: "Stelle Radabstand und die Radwege ein, dann fahre.",
  pfad: "Stelle die Segmente ein, dann fahre.",
  teleop: "Fahre mit W, A, S und D.",
  ziel: "Klicke in die Fläche, um ein Ziel zu setzen.",
};

const HIT: Record<LaborKind, string> = {
  gerade: "Getroffen — Mission „{title}“.",
  drehung: "Getroffen — Mission „{title}“.",
  pfad: "Pfad beendet — Mission „{title}“.",
  teleop: "Mission „{title}“ ist geschlossen.",
  ziel: "Ziel erreicht — Mission „{title}“.",
};

export function ComposedLab({
  lesson,
  copy,
  nextHref,
}: {
  lesson: Lesson;
  copy: LessonCopy;
  nextHref?: string;
}) {
  const labor = copy.labor;
  if (!labor) return null;
  return <ComposedDrive lesson={lesson} copy={copy} labor={labor} nextHref={nextHref} />;
}

function ComposedDrive({
  lesson,
  copy,
  labor,
  nextHref,
}: {
  lesson: Lesson;
  copy: LessonCopy;
  labor: LaborBlock;
  nextHref?: string;
}) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: lesson.track, lessonId: lesson.id, allDone: checklist.allDone });
  const [umfang, setUmfang] = useState(labor.umfang);
  const [umdrehungen, setUmdrehungen] = useState(labor.umdrehungen);
  const [abstand, setAbstand] = useState(labor.abstand);
  const [links, setLinks] = useState(labor.links);
  const [rechts, setRechts] = useState(labor.rechts);
  const [segmente, setSegmente] = useState(labor.segmente);
  const [distanceM, setDistanceM] = useState(0);
  const [headingRad, setHeadingRad] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [arrival, setArrival] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const handled = useRef(0);
  const kind = labor.kind;
  const targetRad = (labor.ziel * Math.PI) / 180;
  const toleranceRad = (labor.toleranz * Math.PI) / 180;
  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const distanceHit = Math.abs(distanceM - labor.ziel) <= labor.toleranz;
  const turnHit = Math.abs(headingRad - targetRad) <= toleranceRad;
  const hit =
    kind === "gerade" ? distanceHit : kind === "drehung" ? turnHit : kind === "ziel" ? arrived : run.session.finished;

  const markMission = checklist.mark;
  const finishDrive = run.session.finish;
  const succeedMission = run.succeed;
  const bannerUp = run.bannerUp;

  useEffect(() => {
    if (kind !== "ziel" || arrival === handled.current || bannerUp) return;
    handled.current = arrival;
    setArrived(true);
    finishDrive();
    if (!open) return;
    markMission(open.id);
    succeedMission(open.title);
  }, [arrival, bannerUp, finishDrive, kind, markMission, open, succeedMission]);

  function markOpen() {
    if (!open) return;
    checklist.mark(open.id);
    run.succeed(open.title);
  }

  const feedback = feedbackLine(kind, copy, open?.title ?? "", {
    finished: run.session.finished,
    hit,
    tooSmall: kind === "drehung" ? Math.abs(headingRad) < Math.abs(targetRad) - toleranceRad : distanceM < labor.ziel - labor.toleranz,
  });
  const heading = TITLES[kind];

  return (
    <LessonStudio
      id={`labor-${kind}`}
      eyebrow={heading.eyebrow}
      title={heading.title}
      boardIntro={copy.missions.intro}
      missions={copy.missions.items.map((item) => ({
        ...item,
        done: Boolean(checklist.done[item.id]),
      }))}
      lessonId={lesson.id}
      lab={kind === "teleop" ? "teleop" : kind === "ziel" ? "goal" : "none"}
      track={lesson.track === "ros" ? "ros" : "autonom"}
      showTopics={lesson.track === "ros" && (kind === "teleop" || kind === "ziel")}
      driveLabel={kind === "teleop" ? "Geschafft" : "Fahren"}
      showDrive={kind !== "ziel" && (kind !== "teleop" || missionIds.length > 0)}
      poseResetId={kind === "teleop" || kind === "ziel" ? run.session.resetId : undefined}
      onGoalReached={() => setArrival((value) => value + 1)}
      ruler={
        kind === "gerade"
          ? {
              circumferenceCm: umfang,
              revolutions: umdrehungen,
              runId: run.session.runId,
              resetId: run.session.resetId,
              onDistance: setDistanceM,
              onDone: (meters) => {
                setDistanceM(meters);
                run.session.finish();
                if (Math.abs(meters - labor.ziel) > labor.toleranz) return;
                markOpen();
              },
            }
          : undefined
      }
      turn={
        kind === "drehung"
          ? {
              separationCm: abstand,
              leftPathCm: links,
              rightPathCm: rechts,
              runId: run.session.runId,
              resetId: run.session.resetId,
              onHeading: setHeadingRad,
              onDone: (radians) => {
                setHeadingRad(radians);
                run.session.finish();
                if (Math.abs(radians - targetRad) > toleranceRad) return;
                markOpen();
              },
            }
          : undefined
      }
      path={
        kind === "pfad"
          ? {
              circumferenceCm: umfang,
              separationCm: abstand,
              segments: segmente.map((segment) => ({ leftCm: segment.links, rightCm: segment.rechts })),
              waypoints: [],
              runId: run.session.runId,
              resetId: run.session.resetId,
              onPose: () => {},
              onDone: () => {
                run.session.finish();
                markOpen();
              },
            }
          : undefined
      }
      stampHref={nextHref}
      allDone={checklist.allDone}
      banner={missionIds.length === 0 ? "hidden" : run.banner}
      missionIndex={checklist.index}
      missionTotal={missionIds.length}
      task={open?.task ?? ""}
      successTitle={run.doneTitle}
      onBannerNext={() => run.setBanner(run.banner === "success" ? "task" : "hidden")}
      onRestart={() => {
        setDistanceM(0);
        setHeadingRad(0);
        setArrived(false);
        setNote(null);
        checklist.reset();
        run.restart();
      }}
      running={run.session.running}
      driveDisabled={run.bannerUp}
      onDrive={() => {
        if (kind === "teleop") {
          run.session.finish();
          markOpen();
          return;
        }
        if (kind === "pfad" && segmente.length === 0) {
          setNote("Lege mindestens ein Segment an.");
          return;
        }
        setNote(null);
        setDistanceM(0);
        setHeadingRad(0);
        run.session.drive();
      }}
      onReset={() => {
        setDistanceM(0);
        setHeadingRad(0);
        setArrived(false);
        setNote(null);
        run.session.reset();
      }}
      feedback={feedback}
      feedbackOk={run.session.finished && hit}
      notice={note}
    >
      {kind === "gerade" ? (
        <>
          <p className="text-sm">
            Ziel {formatDe(labor.ziel, 2)} m, Toleranz {formatDe(labor.toleranz, 3)} m.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberControl
              id="labor-umfang"
              label="Umfang"
              unit="cm"
              min={1}
              max={80}
              step={0.1}
              value={umfang}
              disabled={run.session.running}
              onChange={(value) => {
                setUmfang(value);
                run.session.clearFinished();
              }}
            />
            <NumberControl
              id="labor-umdrehungen"
              label="Umdrehungen"
              min={-40}
              max={40}
              step={0.1}
              value={umdrehungen}
              disabled={run.session.running}
              onChange={(value) => {
                setUmdrehungen(value);
                run.session.clearFinished();
              }}
            />
          </div>
        </>
      ) : null}
      {kind === "drehung" ? (
        <>
          <p className="text-sm">
            Ziel {formatDe(labor.ziel, 1)}°, Toleranz {formatDe(labor.toleranz, 1)}°.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberControl
              id="labor-abstand"
              label="Radabstand"
              unit="cm"
              min={4}
              max={40}
              step={0.1}
              value={abstand}
              disabled={run.session.running}
              onChange={setAbstand}
            />
            <NumberControl
              id="labor-links"
              label="Weg links"
              unit="cm"
              min={-150}
              max={150}
              step={0.1}
              value={links}
              disabled={run.session.running}
              onChange={setLinks}
            />
            <NumberControl
              id="labor-rechts"
              label="Weg rechts"
              unit="cm"
              min={-150}
              max={150}
              step={0.1}
              value={rechts}
              disabled={run.session.running}
              onChange={setRechts}
            />
          </div>
        </>
      ) : null}
      {kind === "pfad" ? (
        <div className="grid gap-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberControl
              id="labor-pfad-umfang"
              label="Umfang"
              unit="cm"
              min={1}
              max={80}
              step={0.1}
              value={umfang}
              disabled={run.session.running}
              onChange={setUmfang}
            />
            <NumberControl
              id="labor-pfad-abstand"
              label="Radabstand"
              unit="cm"
              min={4}
              max={40}
              step={0.1}
              value={abstand}
              disabled={run.session.running}
              onChange={setAbstand}
            />
          </div>
          {segmente.map((segment, index) => (
            <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <NumberControl
                id={`labor-segment-links-${index}`}
                label={`Segment ${index + 1}, links`}
                unit="cm"
                min={-150}
                max={150}
                step={0.1}
                value={segment.links}
                disabled={run.session.running}
                onChange={(linksCm) =>
                  setSegmente((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? { ...item, links: linksCm } : item)),
                  )
                }
              />
              <NumberControl
                id={`labor-segment-rechts-${index}`}
                label={`Segment ${index + 1}, rechts`}
                unit="cm"
                min={-150}
                max={150}
                step={0.1}
                value={segment.rechts}
                disabled={run.session.running}
                onChange={(rechtsCm) =>
                  setSegmente((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? { ...item, rechts: rechtsCm } : item)),
                  )
                }
              />
              <Button
                type="button"
                disabled={run.session.running}
                onClick={() => setSegmente((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                Entfernen
              </Button>
            </div>
          ))}
          {segmente.length < 4 ? (
            <Button
              type="button"
              disabled={run.session.running}
              onClick={() => setSegmente((current) => [...current, { links: 10, rechts: 10 }])}
            >
              Segment
            </Button>
          ) : null}
        </div>
      ) : null}
    </LessonStudio>
  );
}

function feedbackLine(
  kind: LaborKind,
  copy: LessonCopy,
  title: string,
  state: { finished: boolean; hit: boolean; tooSmall: boolean },
) {
  const idle = sentence(copy.texts, "idle", IDLE[kind]);
  const success = fillCopy(sentence(copy.texts, "hit", HIT[kind]), { title });
  if (!state.finished) return idle;
  if (kind === "pfad" || kind === "teleop" || kind === "ziel") return state.hit ? success : idle;
  if (!state.hit) {
    return state.tooSmall
      ? sentence(copy.texts, "short", kind === "drehung" ? "Noch zu wenig gedreht." : "Noch zu kurz.")
      : sentence(copy.texts, "long", kind === "drehung" ? "Noch zu weit gedreht." : "Noch zu weit.");
  }
  return success;
}

function sentence(texts: Record<string, string>, key: string, fallback: string) {
  const value = texts[key]?.trim();
  return value ? texts[key] : fallback;
}

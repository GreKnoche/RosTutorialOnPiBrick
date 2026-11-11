"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard, type MissionItem } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { RobotLab, type PathDrive, type RulerDrive, type TurnDrive } from "@/components/robot-lab";
import type { LabKind, TrackId } from "@/lib/types";

export function LessonStudio({
  id,
  eyebrow,
  title,
  boardIntro,
  missions,
  lessonId,
  ruler,
  turn,
  path,
  lab = "none",
  track = "autonom",
  showTopics = false,
  driveLabel = "Fahren",
  showDrive = true,
  poseResetId,
  onGoalReached,
  stampHref,
  allDone,
  banner,
  missionIndex,
  missionTotal,
  task,
  successTitle,
  onBannerNext,
  onRestart,
  running,
  driveDisabled,
  onDrive,
  onReset,
  feedback,
  feedbackOk = false,
  notice,
  showFeedback = true,
  before,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  boardIntro: string;
  missions: MissionItem[];
  lessonId: string;
  ruler?: RulerDrive;
  turn?: TurnDrive;
  path?: PathDrive;
  lab?: LabKind;
  track?: TrackId;
  showTopics?: boolean;
  driveLabel?: string;
  showDrive?: boolean;
  poseResetId?: number;
  onGoalReached?: () => void;
  stampHref?: string;
  allDone: boolean;
  banner: "task" | "success" | "hidden";
  missionIndex: number;
  missionTotal: number;
  task: string;
  successTitle: string | null;
  onBannerNext: () => void;
  onRestart?: () => void;
  running: boolean;
  driveDisabled?: boolean;
  onDrive: () => void;
  onReset: () => void;
  feedback: string;
  feedbackOk?: boolean;
  notice?: string | null;
  showFeedback?: boolean;
  before?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <LessonSection id={id} eyebrow={eyebrow} title={title}>
      <MissionBoard intro={boardIntro} missions={missions} />
      {before}
      <RobotLab
        lab={lab}
        lessonId={lessonId}
        track={track}
        showTopics={showTopics}
        ruler={ruler}
        turn={turn}
        path={path}
        poseResetId={poseResetId}
        onGoalReached={onGoalReached}
        overlay={
          allDone ? (
            <MissionStamp href={stampHref} onRestart={onRestart} />
          ) : banner === "hidden" ? null : (
            <MissionBanner
              index={missionIndex}
              total={missionTotal}
              task={task}
              success={banner === "success" ? successTitle : null}
              onNext={onBannerNext}
            />
          )
        }
      />
      {children}
      <div className="flex flex-wrap items-center gap-2">
        {showDrive ? (
          <Button type="button" disabled={running || driveDisabled} onClick={onDrive}>
            {driveLabel}
          </Button>
        ) : null}
        <Button type="button" onClick={onReset}>
          Zurücksetzen
        </Button>
      </div>
      {showFeedback ? (
        <p role="status" className={`text-sm leading-6 ${feedbackOk ? "text-emerald-800" : ""}`}>
          {feedback}
        </p>
      ) : null}
      {notice ? <p className="text-sm leading-6">{notice}</p> : null}
    </LessonSection>
  );
}

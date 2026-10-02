"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard, type MissionItem } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { RobotLab, type PathDrive, type RulerDrive, type TurnDrive } from "@/components/robot-lab";

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
  stampHref,
  allDone,
  banner,
  missionIndex,
  missionTotal,
  task,
  successTitle,
  onBannerNext,
  running,
  driveDisabled,
  onDrive,
  onReset,
  feedback,
  feedbackOk = false,
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
  stampHref?: string;
  allDone: boolean;
  banner: "task" | "success" | "hidden";
  missionIndex: number;
  missionTotal: number;
  task: string;
  successTitle: string | null;
  onBannerNext: () => void;
  running: boolean;
  driveDisabled?: boolean;
  onDrive: () => void;
  onReset: () => void;
  feedback: string;
  feedbackOk?: boolean;
  showFeedback?: boolean;
  before?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <LessonSection id={id} eyebrow={eyebrow} title={title}>
      <MissionBoard intro={boardIntro} missions={missions} />
      {before}
      <RobotLab
        lab="none"
        lessonId={lessonId}
        showTopics={false}
        ruler={ruler}
        turn={turn}
        path={path}
        overlay={
          allDone ? (
            <MissionStamp href={stampHref} />
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
        <Button type="button" disabled={running || driveDisabled} onClick={onDrive}>
          Fahren
        </Button>
        <Button type="button" onClick={onReset}>
          Zurücksetzen
        </Button>
      </div>
      {showFeedback ? (
        <p role="status" className={`text-sm leading-6 ${feedbackOk ? "text-emerald-800" : ""}`}>
          {feedback}
        </p>
      ) : null}
    </LessonSection>
  );
}

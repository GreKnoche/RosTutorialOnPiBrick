"use client";

import { useEffect, useRef, useState } from "react";
import { BtBuilder, MissionCourse } from "@/components/lessons/behavior-trees/builder";
import { BtDemo } from "@/components/lessons/behavior-trees/demo";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { Button } from "@/components/ui/button";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { step, type BTNode, type DemoFrame } from "@/lib/bt-demo";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import {
  blankFrame,
  courseFor,
  missionVerdict,
  shapeMatches,
  toRuntime,
  treeRunnable,
  withDriveGoals,
  type StudentNode,
} from "@/lib/bt-missions";

export function BehaviorTreesLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "01", allDone: checklist.allDone });
  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const course = courseFor(open?.id ?? null);
  const [tree, setTree] = useState<StudentNode | null>(null);
  const [frame, setFrame] = useState<DemoFrame>(() => blankFrame(courseFor("reihenfolge")));
  const [driving, setDriving] = useState(false);
  const [note, setNote] = useState(copy.texts.idle ?? "");
  const runtimeRef = useRef<BTNode | null>(null);
  const shapeRef = useRef(false);
  const judgedRef = useRef(false);

  useEffect(() => {
    if (!checklist.openId) return;
    setTree(null);
    setFrame(blankFrame(courseFor(checklist.openId)));
    setDriving(false);
    runtimeRef.current = null;
    judgedRef.current = false;
    setNote(copy.texts.idle ?? "");
  }, [checklist.openId, copy.texts.idle]);

  useEffect(() => {
    if (!driving) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.02, (now - last) / 1000) * 0.75;
      last = now;
      setFrame((current) => {
        const runtime = runtimeRef.current;
        if (!runtime || current.world.done || current.status[runtime.id] === "failure") return current;
        return step(current.world, dt, runtime);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [driving]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!driving || !runtime || !open) return;
    const failed = frame.status[runtime.id] === "failure";
    if (!frame.world.done && !failed) return;
    setDriving(false);
    if (judgedRef.current) return;
    judgedRef.current = true;
    const verdict = missionVerdict(open.id, frame.world, shapeRef.current);
    if (verdict === "ok") {
      const title = open.title;
      checklist.mark(open.id);
      run.succeed(title);
      setNote(fillCopy(copy.texts.ok ?? "", { title }));
      return;
    }
    setNote(copy.texts[verdict] ?? "");
  }, [checklist, copy.texts, driving, frame, open, run]);

  function drive() {
    if (!open || !tree) return;
    const assigned = withDriveGoals(tree, course.goals);
    if (!assigned || !treeRunnable(assigned)) {
      setNote(copy.texts.shape ?? "");
      return;
    }
    runtimeRef.current = toRuntime(assigned);
    shapeRef.current = shapeMatches(open.id, assigned);
    judgedRef.current = false;
    setFrame(blankFrame(course));
    setNote(copy.texts.running ?? "");
    setDriving(true);
  }

  function resetCar() {
    setDriving(false);
    runtimeRef.current = null;
    judgedRef.current = false;
    setFrame(blankFrame(course));
    setNote(copy.texts.idle ?? "");
  }

  return (
    <>
      <BtDemo />
      <CopySection copy={copy} id="bauen" />
      <MissionBoard
        intro={copy.missions.intro}
        missions={copy.missions.items.map((item) => ({
          ...item,
          done: Boolean(checklist.done[item.id]),
        }))}
      />
      <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {open ? `Mission ${checklist.index}/${copy.missions.items.length}` : "Missionen"}
              </p>
              <h2 className="font-heading mt-1 text-lg font-semibold text-heading">
                {open?.title ?? "Geschafft"}
              </h2>
              {open ? <p className="mt-1 max-w-3xl text-sm leading-6">{open.task}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" disabled={driving || !tree || checklist.allDone} onClick={drive}>
                Fahren
              </Button>
              <Button type="button" onClick={resetCar}>
                Zurücksetzen
              </Button>
            </div>
          </div>
          <BtBuilder
            missionId={open?.id ?? null}
            course={course}
            tree={withDriveGoals(tree, course.goals)}
            frame={frame}
            disabled={driving || checklist.allDone}
            onChange={setTree}
          />
          <MissionCourse frame={frame} />
          <p className="border-t border-border px-4 py-3 text-sm" aria-live="polite">
            {note}
          </p>
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                setTree(null);
                setDriving(false);
                runtimeRef.current = null;
                setFrame(blankFrame(courseFor(missionIds[0] ?? null)));
                setNote(copy.texts.idle ?? "");
              }}
            />
          ) : run.banner === "hidden" ? null : (
            <MissionBanner
              index={checklist.index}
              total={copy.missions.items.length}
              task={open?.task ?? ""}
              success={run.banner === "success" ? run.doneTitle : null}
              onNext={() => run.setBanner(run.banner === "success" ? "task" : "hidden")}
            />
          )}
        </div>
      </section>
    </>
  );
}

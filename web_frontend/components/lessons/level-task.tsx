import Link from "next/link";
import { LessonSection } from "@/components/lesson-section";
import { NodeEditor } from "@/components/lessons/node-editor";
import { lessonHref, type Lesson } from "@/lib/curriculum";
import {
  formatStep,
  lessonLevelKey,
  lessonLevels,
  type LessonLevel,
} from "@/lib/lesson-levels";
import { cn } from "@/lib/utils";

const LEVELS: { id: LessonLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export function LevelSwitch({ lesson, level }: { lesson: Lesson; level: LessonLevel }) {
  const href = lessonHref(lesson);
  return (
    <nav aria-label="Schwierigkeit" className="flex flex-wrap gap-2">
      {LEVELS.map((item) => {
        const current = level === item.id;
        return (
          <Link
            key={item.id}
            href={item.id === "beginner" ? href : `${href}?stufe=${item.id}`}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-sm",
              current
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LevelTask({ lesson, level }: { lesson: Lesson; level: "medium" | "hard" }) {
  const spec = lessonLevels[`${lesson.track}:${lesson.id}`];
  const key = lessonLevelKey(lesson.track, lesson.id);
  const steps = spec ? spec[level] : [];
  const file = `companion/src/brick_lessons/brick_lessons/${level}/${key}.py`;
  const command = `ros2 run brick_lessons ${key}_${level}`;
  return (
    <LessonSection
      id="stufe"
      eyebrow={level === "medium" ? "Medium" : "Hard"}
      title={
        level === "medium"
          ? "Im vorgefertigten Knoten die Aktion aufrufen"
          : "Den Knoten selbst schreiben"
      }
    >
      {spec ? (
        <p className="max-w-2xl text-sm leading-7">{spec.focus}</p>
      ) : (
        <p className="max-w-2xl text-sm leading-7">
          Für diese Lektion ist noch kein Auftrag hinterlegt.
        </p>
      )}
      {steps.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-heading">Ziele an /drive</h3>
          <ol className="list-decimal pl-5 text-sm leading-7">
            {steps.map((step, index) => (
              <li key={`${step.distanceM}-${step.yawRad}-${index}`}>{formatStep(step)}</li>
            ))}
          </ol>
        </div>
      ) : null}
      <NodeEditor track={lesson.track} lessonId={lesson.id} level={level} />
      <p className="font-mono text-[0.65rem] leading-5">
        {file}
        <br />
        {command}
      </p>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-heading">Action Server starten</h3>
        <ul className="flex flex-col gap-2 text-sm leading-7">
          <li>
            Canvas: das Web-Backend ist der Twin auf dieser Seite. Es veröffentlicht /odom und
            nimmt /cmd_vel an, der Knoten bewegt also dieselbe Fläche. Dann{" "}
            <code className="font-mono text-[0.65rem]">
              ros2 launch brick_bringup tutorial.launch.py backend:=canvas
            </code>
          </li>
          <li>
            Gazebo:{" "}
            <code className="font-mono text-[0.65rem]">
              ros2 launch brick_bringup tutorial.launch.py backend:=gazebo
            </code>
          </li>
          <li>
            Hardware:{" "}
            <code className="font-mono text-[0.65rem]">
              ros2 launch brick_bringup tutorial.launch.py backend:=hardware
            </code>
          </li>
        </ul>
        <p className="max-w-2xl text-sm leading-7">
          Der Server liest die Radodometrie auf /odom, nicht /odom/selected, und schickt den
          Fortschritt als Feedback zurück.
        </p>
      </div>
    </LessonSection>
  );
}

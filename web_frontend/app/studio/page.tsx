import Link from "next/link";
import { NewLessonForm } from "@/components/studio/new-lesson-form";
import { lessonModule } from "@/components/lessons/registry";
import { nextLessonId, readCatalog } from "@/lib/catalog-file";
import { lessonsForTrack } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

export default function StudioPage() {
  const catalog = readCatalog();
  const tracks = [
    { id: "autonom" as const, title: "Autonom" },
    { id: "ros" as const, title: "ROS 2" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Lektions-Studio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7">
          Neue Lektionen für Autonom und ROS entstehen hier. Der Text liegt danach unter
          content im Ordner der Lektion. Ein Baustein hängt den roten Twin an, ohne ein eigenes Lab.
        </p>
      </div>
      {tracks.map((track) => {
        const lessons = lessonsForTrack(track.id, catalog);
        return (
          <section key={track.id} className="flex flex-col gap-2">
            <h2 className="font-heading text-lg font-semibold">{track.title}</h2>
            <ul className="flex flex-col gap-1">
              {lessons.map((lesson) => (
                <li key={`${lesson.track}-${lesson.id}`}>
                  <Link
                    href={`/studio/${lesson.track}/${lesson.slug}`}
                    className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                  >
                    <span>
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{lesson.id}</span>
                      {lesson.title}
                    </span>
                    {lessonModule(lesson.track, lesson.slug) ? (
                      <span className="shrink-0 text-xs text-muted-foreground">eigenes Lab</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <NewLessonForm
        nextIds={{
          autonom: nextLessonId(catalog, "autonom"),
          ros: nextLessonId(catalog, "ros"),
        }}
      />
    </div>
  );
}

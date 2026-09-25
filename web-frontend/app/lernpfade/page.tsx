import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LessonIndex } from "@/components/lesson-index";
import { PathIcon } from "@/components/path-icon";
import { curriculumOutline, trackHref } from "@/lib/curriculum";

function availabilityLabel(ready: number, total: number) {
  if (ready === 0) return `${total} Lektionen in Arbeit`;
  const drafts = total - ready;
  return drafts > 0
    ? `${ready} verfügbar · ${drafts} in Arbeit`
    : `${ready} verfügbar`;
}

export default function LearningPathsPage() {
  const outline = curriculumOutline();

  return (
    <div className="flex flex-col gap-10">
      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-heading sm:text-4xl">
        Lernpfade
      </h1>
      {outline.map(({ track, lessons }) => {
        const ready = lessons.filter((lesson) => lesson.status === "ready").length;
        return (
          <section key={track.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-heading flex items-center gap-2 text-xl font-semibold tracking-tight">
                  <PathIcon id={track.id} className="size-7" />
                  <Link href={trackHref(track.id)} className="hover:underline">
                    {track.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">{track.description}</p>
              </div>
              <Badge variant="outline">{availabilityLabel(ready, lessons.length)}</Badge>
            </div>
            <LessonIndex lessons={lessons} showSurface={track.id === "nav2"} />
          </section>
        );
      })}
    </div>
  );
}

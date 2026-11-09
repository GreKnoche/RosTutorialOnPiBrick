import { PathIcon } from "@/components/path-icon";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LessonIndex } from "@/components/lesson-index";
import {
  getTrackMeta,
  lessonsForTrack,
  trackCrumbs,
  type TrackId,
} from "@/lib/curriculum";

export function TrackLessons({
  trackId,
  kicker,
}: {
  trackId: TrackId;
  kicker: string;
}) {
  const track = getTrackMeta(trackId);
  const lessons = lessonsForTrack(trackId);
  const ready = lessons.filter((lesson) => lesson.status === "ready").length;

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs items={trackCrumbs(trackId)} />
      <section className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {kicker}
        </p>
        <h1 className="font-heading flex max-w-3xl items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          <PathIcon id={trackId} className="size-10" />
          {track?.title ?? trackId}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          {track?.description}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          {lessons.length === 0 ? (
            <Badge variant="outline">noch keine Lektionen</Badge>
          ) : (
            <>
              {ready > 0 && <Badge variant="default">{ready} Lektionen verfügbar</Badge>}
              <Badge variant="outline">{lessons.length - ready} Lektionen in Arbeit</Badge>
            </>
          )}
        </div>
      </section>
      <LessonIndex lessons={lessons} />
    </div>
  );
}

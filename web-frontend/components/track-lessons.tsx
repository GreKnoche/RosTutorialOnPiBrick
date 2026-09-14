import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LessonCards } from "@/components/lesson-cards";
import {
  getTrackMeta,
  lessonHref,
  lessonsForTrack,
  trackCrumbs,
  type TrackId,
} from "@/lib/curriculum";

export function TrackLessons({
  trackId,
  kicker,
  showSurface = false,
}: {
  trackId: TrackId;
  kicker: string;
  showSurface?: boolean;
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
        <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {track?.title ?? trackId}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          {track?.description}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          {ready > 0 && <Badge variant="default">{ready} lessons ready</Badge>}
          <Badge variant="outline">
            {ready > 0
              ? `${lessons.length - ready} stubs to fill in`
              : `${lessons.length} placeholders`}
          </Badge>
        </div>
      </section>
      <LessonCards lessons={lessons} hrefFor={lessonHref} showSurface={showSurface} />
    </div>
  );
}

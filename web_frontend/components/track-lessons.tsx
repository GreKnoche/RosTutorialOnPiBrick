import type { ReactNode } from "react";
import { PathIcon } from "@/components/path-icon";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TrackPath } from "@/components/track-path";
import { readCatalog } from "@/lib/catalog-file";
import {
  getTrackMeta,
  lessonsForTrack,
  trackCrumbs,
  type TrackId,
} from "@/lib/curriculum";

export function TrackLessons({
  trackId,
  kicker,
  children,
}: {
  trackId: TrackId;
  kicker: string;
  children?: ReactNode;
}) {
  const catalog = readCatalog();
  const track = getTrackMeta(trackId, catalog);
  const lessons = lessonsForTrack(trackId, catalog);

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs items={trackCrumbs(trackId, undefined, catalog)} />
      <section className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {kicker}
        </p>
        <h1 className="font-heading flex max-w-3xl items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          <PathIcon id={trackId} className="size-10" />
          {track?.title ?? trackId}
        </h1>
        {track?.description ? (
          <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">{track.description}</p>
        ) : null}
      </section>
      {lessons.length > 0 ? (
        children ? (
          <div className="grid items-start gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
            <TrackPath lessons={lessons} />
            <div className="flex min-w-0 flex-col gap-6 pt-3">{children}</div>
          </div>
        ) : (
          <TrackPath lessons={lessons} />
        )
      ) : null}
    </div>
  );
}

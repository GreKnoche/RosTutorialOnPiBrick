import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LessonIndex } from "@/components/lesson-index";
import { curriculumOutline, trackHref } from "@/lib/curriculum";

function availabilityLabel(ready: number, total: number) {
  if (ready === 0) return `${total} Lektionen in Arbeit`;
  const drafts = total - ready;
  return drafts > 0
    ? `${ready} verfügbar · ${drafts} in Arbeit`
    : `${ready} verfügbar`;
}

export default function HomePage() {
  const outline = curriculumOutline();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          ROS 2 Jazzy · BrickPi3 · Gazebo
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-heading sm:text-4xl">
          Lernpfade
        </h1>
      </section>

      {outline.map(({ track, lessons }, index) => {
        const ready = lessons.filter((lesson) => lesson.status === "ready").length;
        const lead = index === 0;
        return (
          <section
            key={track.id}
            className={lead ? "flex flex-col gap-3 border-l-2 border-heading pl-4" : "flex flex-col gap-3"}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <h2
                  className={
                    lead
                      ? "font-heading text-2xl font-semibold tracking-tight text-heading"
                      : "font-heading text-xl font-semibold tracking-tight"
                  }
                >
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

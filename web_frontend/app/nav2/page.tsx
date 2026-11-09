import { Nav2Lab } from "@/components/nav2-lab";
import { TrackLessons } from "@/components/track-lessons";

export default async function Nav2Page({
  searchParams,
}: {
  searchParams: Promise<{ kapitel?: string }>;
}) {
  const { kapitel } = await searchParams;
  return (
    <div className="flex flex-col gap-8">
      <TrackLessons trackId="nav2" kicker="Nav2-Lernpfad" bare />
      <Nav2Lab kapitel={kapitel ?? null} />
    </div>
  );
}

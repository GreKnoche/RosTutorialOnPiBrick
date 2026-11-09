import { CityLab } from "@/components/city-lab";
import { TrackLessons } from "@/components/track-lessons";

export default async function Nav2Page({
  searchParams,
}: {
  searchParams: Promise<{ kapitel?: string }>;
}) {
  const { kapitel } = await searchParams;
  return (
    <div className="flex flex-col gap-10">
      <TrackLessons trackId="nav2" kicker="Nav2-Lernpfad" />
      <CityLab kapitel={kapitel ?? null} embedded />
    </div>
  );
}

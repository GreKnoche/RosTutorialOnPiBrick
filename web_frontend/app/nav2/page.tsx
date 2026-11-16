import { Nav2Lab } from "@/components/nav2-lab";
import { isMissionId } from "@/lib/nav2-lessons";

export default async function Nav2Page({
  searchParams,
}: {
  searchParams: Promise<{ kapitel?: string; mission?: string }>;
}) {
  const { kapitel, mission } = await searchParams;
  return (
    <div className="-mt-5">
      <Nav2Lab kapitel={kapitel ?? null} initialMission={isMissionId(mission) ? mission : null} />
    </div>
  );
}

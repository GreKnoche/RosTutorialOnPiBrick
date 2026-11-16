import { AllTracksPath } from "@/components/all-tracks-path";
import { readCatalog } from "@/lib/catalog-file";
import { lessonsForTrack } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

export default function LearningPathsPage() {
  const catalog = readCatalog();
  const autonomLessons = lessonsForTrack("autonom", catalog);
  const rosLessons = lessonsForTrack("ros", catalog);

  return (
    <div className="flex flex-col items-center gap-8">
      <h1 className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl">
        Lernpfade
      </h1>
      <AllTracksPath autonomLessons={autonomLessons} rosLessons={rosLessons} />
    </div>
  );
}

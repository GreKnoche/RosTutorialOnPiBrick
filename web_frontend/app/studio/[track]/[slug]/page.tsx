import { notFound } from "next/navigation";
import { LessonEditor } from "@/components/studio/lesson-editor";
import { lessonModule } from "@/components/lessons/registry";
import { readCatalog } from "@/lib/catalog-file";
import { getLessonBySlug } from "@/lib/curriculum";
import { emptyLessonCopy } from "@/lib/lesson-copy";
import { loadLessonCopy } from "@/lib/load-lesson-copy";

export const dynamic = "force-dynamic";

export default async function StudioLessonPage({
  params,
}: {
  params: Promise<{ track: string; slug: string }>;
}) {
  const { track, slug } = await params;
  if (track !== "autonom" && track !== "ros") notFound();
  const lesson = getLessonBySlug(track, slug, readCatalog());
  if (!lesson) notFound();
  const copy = loadLessonCopy(lesson.track, lesson.id, lesson.slug) ?? emptyLessonCopy();
  return (
    <LessonEditor
      lesson={lesson}
      initialCopy={copy}
      registered={lessonModule(lesson.track, lesson.slug) !== null}
    />
  );
}

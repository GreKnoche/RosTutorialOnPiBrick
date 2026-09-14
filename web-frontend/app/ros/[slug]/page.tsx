import { notFound } from "next/navigation";
import { LessonPlaceholder } from "@/components/lesson-placeholder";
import { getRosLesson, lessonsForTrack } from "@/lib/curriculum";

export function generateStaticParams() {
  return lessonsForTrack("ros").map((lesson) => ({ slug: lesson.slug }));
}

export default async function RosLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getRosLesson(slug);
  if (!lesson) notFound();
  return <LessonPlaceholder lesson={lesson} />;
}

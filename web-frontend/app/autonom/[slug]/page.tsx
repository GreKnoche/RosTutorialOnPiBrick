import { notFound } from "next/navigation";
import { LessonPlaceholder } from "@/components/lesson-placeholder";
import { getLessonBySlug, lessonsForTrack } from "@/lib/curriculum";

export function generateStaticParams() {
  return lessonsForTrack("autonom").map((lesson) => ({ slug: lesson.slug }));
}

export default async function AutonomLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLessonBySlug("autonom", slug);
  if (!lesson) notFound();
  return <LessonPlaceholder lesson={lesson} />;
}

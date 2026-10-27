import { notFound } from "next/navigation";
import { LessonPage } from "@/components/lessons/lesson-page";
import { getLessonBySlug, lessonsForTrack } from "@/lib/curriculum";
import { parseLevel } from "@/lib/lesson-levels";

export function generateStaticParams() {
  return lessonsForTrack("autonom").map((lesson) => ({ slug: lesson.slug }));
}

export default async function AutonomLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ stufe?: string }>;
}) {
  const { slug } = await params;
  const { stufe } = await searchParams;
  const lesson = getLessonBySlug("autonom", slug);
  if (!lesson) notFound();
  return <LessonPage lesson={lesson} level={parseLevel(stufe)} />;
}

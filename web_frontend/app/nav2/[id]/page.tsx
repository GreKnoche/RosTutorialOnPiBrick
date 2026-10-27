import { notFound } from "next/navigation";
import { LessonPage } from "@/components/lessons/lesson-page";
import { getLessonById, lessonsForTrack } from "@/lib/curriculum";
import { parseLevel } from "@/lib/lesson-levels";

export function generateStaticParams() {
  return lessonsForTrack("nav2").map((lesson) => ({ id: lesson.id }));
}

export default async function Nav2LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stufe?: string }>;
}) {
  const { id } = await params;
  const { stufe } = await searchParams;
  const lesson = getLessonById("nav2", id);
  if (!lesson) notFound();
  return <LessonPage lesson={lesson} level={parseLevel(stufe)} />;
}

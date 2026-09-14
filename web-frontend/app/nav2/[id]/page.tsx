import { notFound } from "next/navigation";
import { LessonPlaceholder } from "@/components/lesson-placeholder";
import { getLesson, lessonsForTrack } from "@/lib/curriculum";

export function generateStaticParams() {
  return lessonsForTrack("nav2").map((lesson) => ({ id: lesson.id }));
}

export default async function Nav2LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson || lesson.track !== "nav2") notFound();
  return <LessonPlaceholder lesson={lesson} />;
}

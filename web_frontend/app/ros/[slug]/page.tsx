import { notFound } from "next/navigation";
import { LessonPage } from "@/components/lessons/lesson-page";
import { readCatalog } from "@/lib/catalog-file";
import { getLessonBySlug, lessonsForTrack } from "@/lib/curriculum";
import { parseLevel } from "@/lib/lesson-levels";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return lessonsForTrack("ros", readCatalog()).map((lesson) => ({ slug: lesson.slug }));
}

export default async function RosLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ stufe?: string }>;
}) {
  const { slug } = await params;
  const { stufe } = await searchParams;
  const lesson = getLessonBySlug("ros", slug, readCatalog());
  if (!lesson) notFound();
  return <LessonPage lesson={lesson} level={parseLevel(stufe)} />;
}

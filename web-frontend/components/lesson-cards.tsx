import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lesson } from "@/lib/types";

export function LessonCards({
  lessons,
  hrefFor,
  showSurface = false,
}: {
  lessons: Lesson[];
  hrefFor: (lesson: Lesson) => string;
  showSurface?: boolean;
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <Link href={hrefFor(lesson)} className="block h-full">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-mono text-sm text-muted-foreground">
                    {lesson.id}
                  </CardTitle>
                  <Badge variant={lesson.status === "ready" ? "default" : "outline"}>
                    {lesson.status}
                  </Badge>
                </div>
                <CardTitle>{lesson.title}</CardTitle>
                <CardDescription>{lesson.summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate font-mono">
                  {showSurface ? lesson.nav2_surface : lesson.slug}
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ol>
  );
}

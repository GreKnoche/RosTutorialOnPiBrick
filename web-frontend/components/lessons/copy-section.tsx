import type { ReactNode } from "react";
import { LessonSection } from "@/components/lesson-section";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import type { LessonCopy } from "@/lib/lesson-copy";

export function CopySection({
  copy,
  id,
  children,
}: {
  copy: LessonCopy;
  id: string;
  children?: ReactNode;
}) {
  const section = copy.sections[id];
  if (!section) return null;

  return (
    <LessonSection id={`${id}-title`} eyebrow={section.eyebrow} title={section.title}>
      {section.body ? <MarkdownBlock source={section.body} /> : null}
      {children}
    </LessonSection>
  );
}

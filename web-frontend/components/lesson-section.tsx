import type { ReactNode } from "react";

export function LessonSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 id={id} className="font-heading mt-1 text-lg font-semibold text-heading">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

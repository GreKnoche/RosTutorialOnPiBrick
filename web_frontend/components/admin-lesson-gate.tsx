"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useDebugAdmin } from "@/lib/debug-admin";
import { trackHref, type Lesson } from "@/lib/curriculum";

export function AdminLessonGate({ lesson, children }: { lesson: Lesson; children: ReactNode }) {
  const admin = useDebugAdmin();
  if (lesson.adminOnly && !admin) {
    return (
      <div className="flex max-w-xl flex-col gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Nur für Admins</h1>
        <p className="text-sm leading-7 text-foreground">
          „{lesson.title}“ ist im Lernpfad vorerst verborgen. Melde dich oben mit dem Admin-Konto an,
          um die Station zu öffnen.
        </p>
        <Link href={trackHref(lesson.track)} className="text-sm font-medium text-heading hover:underline">
          Zurück zum Lernpfad
        </Link>
      </div>
    );
  }
  return children;
}
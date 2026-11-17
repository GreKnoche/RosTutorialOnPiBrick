"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useDebugAdmin } from "@/lib/debug-admin";

export function AdminGate({
  children,
  title = "Nur für Admins",
  description,
  backHref = "/lernpfade",
  backLabel = "Zurück zu den Lernpfaden",
}: {
  children: ReactNode;
  title?: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  const admin = useDebugAdmin();
  if (!admin) {
    return (
      <div className="flex max-w-xl flex-col gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-7 text-foreground">{description}</p>
        <Link href={backHref} className="text-sm font-medium text-heading hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }
  return children;
}
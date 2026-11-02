import type { GlossaryEntry } from "@/lib/glossary";

export function GlossarySpoiler({ terms }: { terms: GlossaryEntry[] }) {
  if (terms.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {terms.map((entry) => (
        <details key={entry.term} className="rounded-xl bg-card ring-1 ring-foreground/10">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-heading">
            {entry.term}
          </summary>
          <p className="max-w-2xl border-t border-border px-4 py-3 text-sm leading-6">{entry.body}</p>
        </details>
      ))}
    </div>
  );
}
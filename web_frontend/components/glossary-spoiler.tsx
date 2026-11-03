import type { GlossaryEntry } from "@/lib/glossary";

export function GlossarySpoiler({ terms }: { terms: GlossaryEntry[] }) {
  if (terms.length === 0) return null;

  return (
    <section aria-labelledby="glossary-heading" className="flex flex-col gap-2">
      <h2
        id="glossary-heading"
        className="text-xs font-semibold tracking-wide text-glossary-foreground uppercase"
      >
        Begriffe zum Einstieg
      </h2>
      <div className="flex flex-col gap-2">
        {terms.map((entry) => (
          <details
            key={entry.term}
            className="overflow-hidden rounded-xl bg-glossary ring-1 ring-glossary-border"
          >
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-glossary-foreground transition-colors hover:bg-glossary-hover">
              {entry.term}
            </summary>
            <p className="max-w-2xl border-t border-glossary-border bg-card/70 px-4 py-3 text-sm leading-6">
              {entry.body}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
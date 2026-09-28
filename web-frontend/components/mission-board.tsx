import { Check } from "lucide-react";

export type MissionItem = {
  id: string;
  title: string;
  hint: string;
  done: boolean;
};

export function MissionBoard({ intro, missions }: { intro: string; missions: MissionItem[] }) {
  const columns = missions.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Missionen
        </p>
        <p className="mt-1 text-sm leading-6">{intro}</p>
      </div>
      <ol className={`grid gap-0 ${columns}`}>
        {missions.map((mission, index) => (
          <li
            key={mission.id}
            className={`flex gap-3 px-4 py-3 ${index > 0 ? "border-t border-border sm:border-t-0 sm:border-l" : ""}`}
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ${
                mission.done ? "bg-heading text-background ring-heading" : "ring-foreground/20"
              }`}
              aria-hidden="true"
            >
              {mission.done ? <Check className="size-3.5" /> : null}
            </span>
            <span>
              <span className="block text-sm font-medium text-heading">
                {mission.title}
                {mission.done ? <span className="sr-only">, geschafft</span> : null}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{mission.hint}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

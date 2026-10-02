import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TwinStamp } from "@/components/logo-mark";

const BAND = "bg-[#2f6b4f] text-white";

export function MissionBanner({
  index,
  total,
  task,
  success,
  onNext,
}: {
  index: number;
  total: number;
  task: string;
  success?: string | null;
  onNext: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center">
      <div className={`pointer-events-auto w-full px-5 py-4 text-center ${BAND}`} role="status">
        <p className="font-display text-3xl uppercase leading-none tracking-[0.08em] sm:text-4xl">
          {success ? "Mission Success" : `Mission ${index}/${total}`}
        </p>
        {success ? null : (
          <p className="mt-2 text-sm leading-6 text-white/90">{task}</p>
        )}
        <div className="mt-3">
          <Button
            type="button"
            onClick={onNext}
            className="bg-white text-[#2f6b4f] hover:bg-white/90 hover:text-[#2f6b4f]"
          >
            Weiter
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MissionStamp({ href, onRestart }: { href?: string; onRestart?: () => void }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-6"
      role="status"
    >
      <TwinStamp className="size-36" />
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
        {href ? (
          <Link
            href={href}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-2.5 text-sm font-medium text-[#2f6b4f] hover:bg-white/90"
          >
            Nächste Lektion
          </Link>
        ) : null}
        {onRestart ? (
          <Button
            type="button"
            onClick={onRestart}
            className="h-8 bg-white/90 text-[#2f6b4f] hover:bg-white hover:text-[#2f6b4f]"
          >
            Neustart
          </Button>
        ) : null}
      </div>
    </div>
  );
}

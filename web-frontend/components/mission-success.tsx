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
          {success ? "Mission geschafft" : `Mission ${index}/${total}`}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/90">{success ?? task}</p>
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

export function MissionStamp({ href }: { href?: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-6"
      role="status"
    >
      <TwinStamp className="size-36" />
      {href ? (
        <Link
          href={href}
          className="pointer-events-auto inline-flex h-8 items-center justify-center rounded-lg bg-white px-2.5 text-sm font-medium text-[#2f6b4f] hover:bg-white/90"
        >
          Nächste Mission
        </Link>
      ) : null}
    </div>
  );
}

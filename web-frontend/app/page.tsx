import Link from "next/link";
import { StartDrive } from "@/components/start-drive";

export default function HomePage() {
  return (
    <>
      <StartDrive />
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div data-start-copy className="flex flex-col items-center gap-5 bg-background px-6 py-6">
          <h1 data-start-heading className="max-w-md text-4xl font-semibold tracking-tight text-heading sm:text-6xl">
            Autonomes Fahren lernen
          </h1>
          <p className="max-w-sm text-lg">
            Vom Fahrzeugmodell über ROS 2 bis zur Navigation mit Nav2.
          </p>
          <Link
            data-start-button
            href="/auswahl"
            className="inline-flex h-14 w-fit items-center justify-center rounded-lg bg-primary px-10 text-lg font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start
          </Link>
        </div>
      </section>
    </>
  );
}

import { Box } from "@/components/box";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          ROS 2 Jazzy · BrickPi3 · Gazebo
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-heading sm:text-4xl">
          Tutorials
        </h1>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Box href="/ros" className="min-h-64 justify-end">
          <h2 className="text-2xl font-semibold text-heading">ROS</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ROS 2 auf dem Companion-PC, BrickPi3 auf dem Raspberry Pi.
          </p>
        </Box>
        <Box href="/nav2" className="min-h-64 justify-end">
          <h2 className="text-2xl font-semibold text-heading">Nav2</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Navigation mit Nav2, Mapping und Gazebo.
          </p>
        </Box>
      </section>
    </div>
  );
}
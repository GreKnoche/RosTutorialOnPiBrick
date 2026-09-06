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
        <a
          href="/ros"
          className="flex min-h-64 flex-col justify-end rounded-2xl border border-border bg-card p-8 text-card-foreground transition hover:border-heading"
        >
          <h2 className="text-2xl font-semibold text-heading">ROS Tutorial</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ROS 2 auf dem Companion-PC, BrickPi3 auf dem Raspberry Pi.
          </p>
        </a>
        <a
          href="/nav2"
          className="flex min-h-64 flex-col justify-end rounded-2xl border border-border bg-card p-8 text-card-foreground transition hover:border-heading"
        >
          <h2 className="text-2xl font-semibold text-heading">Nav2 Tutorial</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Navigation mit Nav2, Mapping und Gazebo.
          </p>
        </a>
      </section>
    </div>
  );
}
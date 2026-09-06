export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
          ROS 2 Jazzy · companion PC · BrickPi3 · Gazebo
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Tutorials
        </h1>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <a
          href="/ros"
          className="flex min-h-64 flex-col justify-end rounded-2xl border border-gray-200 p-8 transition hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-500"
        >
          <h2 className="text-2xl font-semibold">ROS Tutorial</h2>
          <p className="mt-2 text-sm text-gray-500">
            ROS 2 auf dem Companion-PC, BrickPi3 auf dem Raspberry Pi.
          </p>
        </a>
        <a
          href="/nav2"
          className="flex min-h-64 flex-col justify-end rounded-2xl border border-gray-200 p-8 transition hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-500"
        >
          <h2 className="text-2xl font-semibold">Nav2 Tutorial</h2>
          <p className="mt-2 text-sm text-gray-500">
            Navigation mit Nav2, Mapping und Gazebo.
          </p>
        </a>
      </section>
    </div>
  );
}
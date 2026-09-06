export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
          ROS 2 Jazzy · companion PC · BrickPi3 · Gazebo
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Ros & Nav2 Tutorial
        </h1>
        <p className="max-w-2xl text-sm leading-7 sm:text-base">
          ROS & Nav2 Tutorial: ROS 2 on a companion PC, BrickPi3 agent on a Raspberry Pi.
        </p>
      </section>
    </div>
  );
}

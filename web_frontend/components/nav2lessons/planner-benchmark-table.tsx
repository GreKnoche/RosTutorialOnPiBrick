/** Table I — Macenski et al., arXiv:2307.15236 (2023), Path Planners Comparison. */
const ROWS = [
  {
    name: "NavFn (Navigation Function)",
    ros2: false,
    planMs: "61.02",
    planBest: false,
    lenM: "52.25",
    lenBest: false,
    feasible: false,
    circular: true,
    nonCirc: false,
    diff: true,
    omni: true,
    ackermann: false,
    legged: false,
  },
  {
    name: "Lazy Theta*-P (lazy line-of-sight)",
    ros2: true,
    planMs: "94.42",
    planBest: false,
    lenM: "50.28",
    lenBest: true,
    feasible: false,
    circular: true,
    nonCirc: false,
    diff: true,
    omni: true,
    ackermann: false,
    legged: false,
  },
  {
    name: "Smac 2D-A* (2D A*)",
    ros2: true,
    planMs: "88.82",
    planBest: false,
    lenM: "49.65",
    lenBest: true,
    feasible: false,
    circular: true,
    nonCirc: false,
    diff: true,
    omni: true,
    ackermann: false,
    legged: false,
  },
  {
    name: "Smac Hybrid-A* (Hybrid A*)",
    ros2: true,
    planMs: "38.77",
    planBest: true,
    lenM: "50.78",
    lenBest: true,
    feasible: true,
    circular: true,
    nonCirc: true,
    diff: true,
    omni: false,
    ackermann: true,
    legged: true,
  },
  {
    name: "Smac State Lattice",
    ros2: true,
    planMs: "39.40",
    planBest: true,
    lenM: "50.51",
    lenBest: true,
    feasible: true,
    circular: true,
    nonCirc: true,
    diff: true,
    omni: true,
    ackermann: true,
    legged: true,
  },
] as const;

function Mark({ on }: { on: boolean }) {
  return <span className="text-foreground">{on ? "✓" : "–"}</span>;
}

function Num({ value, best }: { value: string; best: boolean }) {
  if (best) {
    return <strong className="font-semibold text-foreground">{value}</strong>;
  }
  return <span>{value}</span>;
}

export function PlannerBenchmarkTable() {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs leading-5 text-muted-foreground">
        Table I — Macenski et al. (2023), Path Planners Comparison. Bold = within 3&nbsp;% of the best benchmark value.
      </figcaption>
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/50">
        <table className="w-max min-w-full border-collapse text-left text-[0.7rem] leading-snug sm:text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
              <th scope="col" className="px-2 py-2 font-semibold whitespace-nowrap align-bottom">
                Path Planner
              </th>
              <th scope="col" className="px-1.5 py-2 font-semibold align-bottom leading-tight">
                <span className="block max-w-[4.5rem]">Plan Time (milliseconds)</span>
              </th>
              <th scope="col" className="px-1.5 py-2 font-semibold align-bottom leading-tight">
                <span className="block max-w-[4rem]">Path Length (meters)</span>
              </th>
              <th scope="col" className="px-1 py-2 text-center font-semibold align-bottom leading-tight">
                Feasible
              </th>
              <th scope="col" className="px-1 py-2 text-center font-semibold align-bottom leading-tight">
                Circular
              </th>
              <th scope="col" className="px-1 py-2 text-center font-semibold align-bottom leading-tight">
                <span className="block max-w-[4.25rem]">Non-Circular</span>
              </th>
              <th scope="col" className="px-1 py-2 text-center font-semibold align-bottom leading-tight">
                Differential
              </th>
              <th scope="col" className="min-w-[5.5rem] px-2 py-2 text-center font-semibold align-bottom leading-tight">
                <span className="inline-block max-w-[5.25rem] text-balance">Omnidirectional</span>
              </th>
              <th scope="col" className="min-w-[4.75rem] px-2 py-2 text-center font-semibold align-bottom leading-tight whitespace-nowrap">
                Ackermann
              </th>
              <th scope="col" className="px-1 py-2 text-center font-semibold align-bottom leading-tight">
                Legged
              </th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {ROWS.map((row) => (
              <tr key={row.name} className="border-b border-border/50 last:border-0">
                <th scope="row" className="px-2 py-1.5 text-left font-medium text-foreground whitespace-nowrap">
                  {row.name}
                  {row.ros2 ? <sup className="ml-0.5 text-[0.6em]">1</sup> : null}
                </th>
                <td className="px-2 py-1.5 tabular-nums">
                  <Num value={row.planMs} best={row.planBest} />
                </td>
                <td className="px-2 py-1.5 tabular-nums">
                  <Num value={row.lenM} best={row.lenBest} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Mark on={row.feasible} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Mark on={row.circular} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Mark on={row.nonCirc} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Mark on={row.diff} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Mark on={row.omni} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Mark on={row.ackermann} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Mark on={row.legged} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.65rem] leading-5 text-muted-foreground">
        <sup>1</sup> Exclusive to ROS 2 (Robot Operating System 2). Smac rows: half-resolution costmap in the paper
        benchmark. Feasible = kinematically drivable path. Checkmark columns: drive types supported per the paper.
      </p>
    </figure>
  );
}

export const PLANNER_BENCHMARK_MARKER = "[planner-benchmark]";

export function hasPlannerBenchmarkMarker(text: string): boolean {
  return text.includes(PLANNER_BENCHMARK_MARKER);
}
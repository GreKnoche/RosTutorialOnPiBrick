import { cityCostmap } from "@/lib/city-costmap";

/** Lesson switch. The controller still starts with the local costmap in nav2_params.yaml. */
export const SHOW_LOCAL_COSTMAP = false;

/** Stock local costmap. Same text as scripts/nav2_params.yaml. */
export const LOCAL_COSTMAP = `local_costmap:
  local_costmap:
    ros__parameters:
      update_frequency: 5.0
      publish_frequency: 2.0
      global_frame: odom
      robot_base_frame: base_link
      rolling_window: true
      width: 4
      height: 4
      resolution: 0.05
      robot_radius: 0.09
      plugins: ["inflation_layer"]
      inflation_layer:
        plugin: "nav2_costmap_2d::InflationLayer"
        cost_scaling_factor: 2.5
        inflation_radius: 0.12
      always_send_full_costmap: true
`;

/** Stock global costmap. Same values as scripts/nav2_params.yaml, with a line on each parameter. */
export const GLOBAL_COSTMAP = `global_costmap:
  global_costmap:
    ros__parameters:
      # Hertz. So oft wird die Karte neu gerechnet.
      update_frequency: 2.0
      # Hertz. So oft geht die Karte an die anderen Knoten.
      publish_frequency: 1.0
      # Rahmen der Karte. odom hängt an der Radodometrie.
      global_frame: odom
      # Das Fenster sitzt auf diesem Rahmen des Autos.
      robot_base_frame: base_link
      # true lässt das Fenster mit dem Auto mitfahren.
      rolling_window: true
      # Meter. Breite des Fensters.
      width: 40
      # Meter. Höhe des Fensters.
      height: 40
      # Meter. Kantenlänge einer Zelle.
      resolution: 0.05
      # Meter. Das Auto gilt als Kreis mit diesem Radius.
      robot_radius: 0.09
      # false zählt unbekannte Zellen als frei.
      track_unknown_space: false
      # Schichten von unten nach oben. Die letzte liest die Zellen der vorigen.
      plugins: ["inflation_layer"]
      inflation_layer:
        # Klasse. Macht Zellen neben einem Hindernis teurer.
        plugin: "nav2_costmap_2d::InflationLayer"
        # Wie steil die Kosten mit dem Abstand fallen. Größer heißt steiler.
        cost_scaling_factor: 2.5
        # Meter. Bis hierhin sind Zellen teurer als frei.
        inflation_radius: 0.12
      # true schickt jedes Mal das ganze Fenster.
      always_send_full_costmap: true
`;

/** Local costmap with houses from /city_obstacles. */
export const LOCAL_CITY = cityCostmap(LOCAL_COSTMAP);
/** Global costmap with houses from /city_obstacles. */
export const GLOBAL_CITY = cityCostmap(GLOBAL_COSTMAP);

/** Costmap lesson only. Coarser cells, a larger robot, and a wide shallow inflation. */
export const COSTMAP_MISSION = cityCostmap(
  GLOBAL_COSTMAP.replace("resolution: 0.05", "resolution: 0.15")
    .replace("robot_radius: 0.09", "robot_radius: 0.1")
    .replace("cost_scaling_factor: 2.5", "cost_scaling_factor: 0.5")
    .replace("inflation_radius: 0.12", "inflation_radius: 0.6"),
);

if (!LOCAL_CITY.includes("nav2_costmap_2d::ObstacleLayer") || !GLOBAL_CITY.includes("nav2_costmap_2d::ObstacleLayer")) {
  throw new Error("Costmap-Vorlage hat keine Hindernisschicht.");
}

export type CostmapRoot = "local_costmap" | "global_costmap";

function tidy(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, "  ");
}

function indentOf(line: string): number {
  return line.match(/^ */)?.[0].length ?? 0;
}

function keyLine(line: string): { indent: number; key: string; value: string } | null {
  const match = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
  if (!match) return null;
  return { indent: match[1].length, key: match[2], value: match[3].trim() };
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

/** The costmap block students edit. Root key stays local_costmap or global_costmap. */
export function costmapError(section: string, root: CostmapRoot): string | null {
  const label = root === "local_costmap" ? "Die lokale Costmap" : "Die globale Costmap";
  if (!section.trim() || section.includes("\0") || section.length > 100_000) {
    return `${label} ist leer.`;
  }
  if (section.includes("\t")) return `${label} darf keine Tabulatoren enthalten.`;
  let seenRoot = false;
  let inflation = false;
  let obstacle = false;
  let obstaclePlugin = false;
  for (const raw of tidy(section).split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const parsed = keyLine(raw);
    if (!parsed) return "Jede Zeile ist ein Parameter oder ein Kommentar.";
    if (parsed.indent === 0) {
      if (parsed.key !== root || seenRoot) return `Die Datei beginnt mit ${root}:.`;
      seenRoot = true;
    }
    if (parsed.key === "inflation_layer" || unquote(parsed.value) === "nav2_costmap_2d::InflationLayer") inflation = true;
    if (parsed.key === "obstacle_layer") obstacle = true;
    if (parsed.key === "plugin" && unquote(parsed.value) === "nav2_costmap_2d::ObstacleLayer") obstaclePlugin = true;
  }
  if (!seenRoot) return `Die Datei beginnt mit ${root}:.`;
  if (!inflation) return "inflation_layer bleibt in der Costmap.";
  if (obstacle && !obstaclePlugin) return "obstacle_layer bleibt nav2_costmap_2d::ObstacleLayer.";
  return null;
}

/** Replace one top-level costmap. The rest of nav2_params.yaml stays. */
export function mergeCostmap(params: string, section: string, root: CostmapRoot): string | null {
  if (costmapError(section, root)) return null;
  const lines = tidy(params).split("\n");
  const start = lines.findIndex((line) => line === `${root}:`);
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim() || lines[index].trim().startsWith("#")) continue;
    if (indentOf(lines[index]) === 0) {
      end = index;
      break;
    }
  }
  const body = tidy(section).replace(/\n*$/, "").split("\n");
  lines.splice(start, end - start, ...body);
  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}

if (
  costmapError(COSTMAP_MISSION, "global_costmap") ||
  !COSTMAP_MISSION.includes("resolution: 0.15") ||
  !COSTMAP_MISSION.includes("robot_radius: 0.1") ||
  !COSTMAP_MISSION.includes("cost_scaling_factor: 0.5") ||
  !COSTMAP_MISSION.includes("inflation_radius: 0.6") ||
  GLOBAL_CITY.includes("resolution: 0.15")
) {
  throw new Error("Costmap-Mission hat nicht die eigene Vorlage.");
}

import { cityCostmap } from "@/lib/city-costmap";

/** Lesson switch. The controller still starts with the local costmap in nav2_params.yaml. */
export const SHOW_LOCAL_COSTMAP = false;

/** Stock local costmap. Same text as scripts/nav2_params.yaml. */
export const LOCAL_COSTMAP = `local_costmap:
  local_costmap:
    ros__parameters:
      # Aktualisierungsrate in Hz, mit der die lokale Costmap neu berechnet wird
      update_frequency: 5.0
      # Veröffentlichungsrate in Hz, mit der die lokale Costmap an andere Knoten gesendet wird
      publish_frequency: 2.0
      # Bezugsrahmen der lokalen Karte ("odom" nutzt die Odometrie)
      global_frame: odom
      # Koordinatenrahmen des Roboters, an dem das Fenster ausgerichtet wird
      robot_base_frame: base_link
      # Lässt den Kartenausschnitt mit dem Roboter mitwandern (true/false)
      rolling_window: true
      # Breite des lokalen Kartenfensters in m
      width: 4
      # Höhe des lokalen Kartenfensters in m
      height: 4
      # Kantenlänge einer einzelnen Rasterzelle in m
      resolution: 0.05
      # Angenommener Radius des Roboters in m für die Kollisionsprüfung
      robot_radius: 0.09
      # Aktive Costmap-Schichten von unten nach oben
      plugins: ["inflation_layer"]
      inflation_layer:
        # Costmap-Schicht, die einen Sicherheitsabstand (Kostengradient) um Hindernisse legt
        plugin: "nav2_costmap_2d::InflationLayer"
        # Steilheit des Kostenabfalls mit dem Abstand (größer = steilerer Abfall)
        cost_scaling_factor: 2.5
        # Abstand in m um ein Hindernis, bis zu dem erhöhte Kosten berechnet werden
        inflation_radius: 0.12
      # Sendet bei jeder Veröffentlichung die komplette Costmap statt nur geänderter Bereiche (true/false)
      always_send_full_costmap: true
`;

/** Stock global costmap. Same values as scripts/nav2_params.yaml, with a line on each parameter. */
export const GLOBAL_COSTMAP = `global_costmap:
  global_costmap:
    ros__parameters:
      # Aktualisierungsrate in Hz, mit der die Costmap neu berechnet wird
      update_frequency: 2.0
      # Veröffentlichungsrate in Hz, mit der die Costmap an andere Knoten gesendet wird
      publish_frequency: 1.0
      # Bezugsrahmen der Karte ("odom" nutzt die Odometrie)
      global_frame: odom
      # Koordinatenrahmen des Roboters, an dem das Fenster ausgerichtet wird
      robot_base_frame: base_link
      # Lässt den Kartenausschnitt mit dem Roboter mitwandern (true/false)
      rolling_window: true
      # Breite des Kartenfensters in m
      width: 40
      # Höhe des Kartenfensters in m
      height: 40
      # Kantenlänge einer einzelnen Rasterzelle in m
      resolution: 0.05
      # Angenommener Radius des Roboters in m für die Kollisionsprüfung
      robot_radius: 0.09
      # Unterscheidet unbekannte von freien Zellen; false behandelt unbekannte Zellen als frei
      track_unknown_space: false
      # Aktive Costmap-Schichten von unten nach oben
      plugins: ["inflation_layer"]
      inflation_layer:
        # Costmap-Schicht, die einen Sicherheitsabstand (Kostengradient) um Hindernisse legt
        plugin: "nav2_costmap_2d::InflationLayer"
        # Steilheit des Kostenabfalls mit dem Abstand (größer = steilerer Abfall)
        cost_scaling_factor: 2.5
        # Abstand in m um ein Hindernis, bis zu dem erhöhte Kosten berechnet werden
        inflation_radius: 0.12
      # Sendet bei jeder Veröffentlichung die komplette Costmap statt nur geänderter Bereiche (true/false)
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

function pluginCostmapPatch(section: string): string {
  return section
    .replace("resolution: 0.05", "resolution: 0.03")
    .replace("robot_radius: 0.09", "robot_radius: 0.05")
    .replace("cost_scaling_factor: 2.5", "cost_scaling_factor: 0.1")
    .replace("inflation_radius: 0.12", "inflation_radius: 0.08");
}

/** Planner-plugin mission: fine grid, city obstacles, narrow inflation. */
export const PLUGIN_GLOBAL_CITY = cityCostmap(pluginCostmapPatch(GLOBAL_COSTMAP));
export const PLUGIN_LOCAL_CITY = cityCostmap(pluginCostmapPatch(LOCAL_COSTMAP));

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

/** German decimal commas on a bare number (`1,0`) are strings in YAML. Nav2 wants a double. */
function decimalDots(section: string): string {
  return section.replace(/^(\s*[A-Za-z_][A-Za-z0-9_]*\s*:\s*)(-?\d+),(\d+)(\s*(?:#.*)?)$/gm, "$1$2.$3$4");
}

/** Replace one top-level costmap. The rest of nav2_params.yaml stays. */
export function mergeCostmap(params: string, section: string, root: CostmapRoot): string | null {
  section = decimalDots(section);
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

if (
  costmapError(PLUGIN_GLOBAL_CITY, "global_costmap") ||
  costmapError(PLUGIN_LOCAL_CITY, "local_costmap") ||
  !PLUGIN_GLOBAL_CITY.includes("resolution: 0.03") ||
  !PLUGIN_GLOBAL_CITY.includes("robot_radius: 0.05") ||
  !PLUGIN_GLOBAL_CITY.includes("cost_scaling_factor: 0.1") ||
  !PLUGIN_GLOBAL_CITY.includes("inflation_radius: 0.08")
) {
  throw new Error("Plugin-Costmap hat nicht die eigene Vorlage.");
}

const LAYER = `      plugins: ["obstacle_layer", "inflation_layer"]
      obstacle_layer:
        # Klasse. Schreibt Messpunkte in die Karte.
        plugin: "nav2_costmap_2d::ObstacleLayer"
        # Name der Quelle darunter.
        observation_sources: city
        city:
          # Punktwolke der Häuser und der gesetzten Blöcke.
          topic: /city_obstacles
          # Nachrichtentyp auf diesem Topic.
          data_type: "PointCloud2"
          # true schreibt getroffene Zellen als Hindernis.
          marking: true
          # false lässt eine gesetzte Zelle stehen.
          clearing: false
          # Meter. Punkte bis zu dieser Entfernung werden Hindernisse.
          obstacle_max_range: 20.0
          # Meter. Punkte ab dieser Entfernung zählen.
          obstacle_min_range: 0.0
          # Meter. Reichweite eines räumenden Strahls. Wirkt bei clearing true.
          raytrace_max_range: 20.0
          # Meter. Untergrenze der Höhe, ab der ein Punkt zählt.
          min_obstacle_height: 0.0
          # Meter. Obergrenze der Höhe, bis zu der ein Punkt zählt.
          max_obstacle_height: 2.0
          # Sekunden. 0 behält eine Markierung.
          observation_persistence: 0.0
          # Hertz. 0 lässt eine Pause der Quelle zu.
          expected_update_rate: 0.0
          # false übergeht unendliche Messwerte.
          inf_is_valid: false
      inflation_layer:`;

const STOCK = `      plugins: ["inflation_layer"]
      inflation_layer:`;

/** One costmap block with the city obstacle layer in front of inflation. */
export function cityCostmap(section: string): string {
  if (!section.includes(STOCK)) throw new Error("Costmap-Vorlage hat keine Inflation-Schicht.");
  return section.replaceAll(STOCK, LAYER);
}

/**
 * Mark houses and the spawned U. A block that already names the obstacle layer stays.
 * Other stations keep the inflation-only costmap.
 */
export function withCityObstacles(params: string): string | null {
  if (!params.includes("inflation_layer:")) return null;
  if (!params.includes(STOCK)) {
    return params.includes('plugin: "nav2_costmap_2d::ObstacleLayer"') ? params : null;
  }
  return params.replaceAll(STOCK, LAYER);
}

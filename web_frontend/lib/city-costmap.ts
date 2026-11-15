const LAYER = `      plugins: ["obstacle_layer", "inflation_layer"]
      obstacle_layer:
        # Costmap-Schicht, die Sensordaten als Hindernisse in die Karte einträgt
        plugin: "nav2_costmap_2d::ObstacleLayer"
        # Liste der benannten Sensorquellen für diese Schicht
        observation_sources: city
        city:
          # Topic, auf dem die Hindernisse der Stadt (Häuser und Blöcke) veröffentlicht werden
          topic: /city_obstacles
          # Nachrichtentyp der Sensorquelle
          data_type: "PointCloud2"
          # Trägt gemessene Punkte als Hindernis in die Costmap ein (true/false)
          marking: true
          # Löscht freie Bereiche entlang des Sensorstrahls wieder aus der Costmap (true/false)
          clearing: false
          # Maximale Entfernung in m, bis zu der Punkte als Hindernis markiert werden
          obstacle_max_range: 20.0
          # Minimale Entfernung in m, ab der Punkte berücksichtigt werden
          obstacle_min_range: 0.0
          # Maximale Reichweite in m für das Freiräumen (wirkt nur bei clearing: true)
          raytrace_max_range: 20.0
          # Minimale Höhe in m, ab der Messpunkte als Hindernis zählen
          min_obstacle_height: 0.0
          # Maximale Höhe in m, bis zu der Messpunkte als Hindernis zählen
          max_obstacle_height: 2.0
          # Speicherdauer von Messpunkten in s (0.0 = dauerhaft ohne Clearing)
          observation_persistence: 0.0
          # Erwartete Update-Rate der Quelle in Hz (0.0 = keine Zeitüberwachung)
          expected_update_rate: 0.0
          # Behandelt unendliche Messwerte (inf) als gültigen Maximalabstand statt sie zu ignorieren (true/false)
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

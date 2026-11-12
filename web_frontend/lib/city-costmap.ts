const LAYER = `      plugins: ["obstacle_layer", "inflation_layer"]
      obstacle_layer:
        plugin: "nav2_costmap_2d::ObstacleLayer"
        observation_sources: city
        city:
          topic: /city_obstacles
          data_type: "PointCloud2"
          marking: true
          clearing: false
          obstacle_max_range: 20.0
          obstacle_min_range: 0.0
          raytrace_max_range: 20.0
          min_obstacle_height: 0.0
          max_obstacle_height: 2.0
          observation_persistence: 0.0
          expected_update_rate: 0.0
          inf_is_valid: false
      inflation_layer:`;

const STOCK = `      plugins: ["inflation_layer"]
      inflation_layer:`;

/** Mark houses and the spawned U. Other stations keep the inflation-only costmap. */
export function withCityObstacles(params: string): string | null {
  if (!params.includes(STOCK)) return null;
  return params.replaceAll(STOCK, LAYER);
}

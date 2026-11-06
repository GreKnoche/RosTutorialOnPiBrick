import type { ComponentType } from "react";
import { BehaviorTreesAnimation } from "@/components/lessons/behavior-trees/animation";
import { BehaviorTreesLab } from "@/components/lessons/behavior-trees/lab";
import { PlannerAnimation } from "@/components/lessons/planner/animation";
import { PlannerLab } from "@/components/lessons/planner/lab";
import { Bt2Animation } from "@/components/lessons/bt2/animation";
import { Bt2Lab } from "@/components/lessons/bt2/lab";
import { PluginsAnimation } from "@/components/lessons/plugins/animation";
import { PluginsLab } from "@/components/lessons/plugins/lab";
import { PlanerControllerAnimation } from "@/components/lessons/planer-controller/animation";
import { PlanerControllerLab } from "@/components/lessons/planer-controller/lab";
import { SmootherAnimation } from "@/components/lessons/smoother/animation";
import { SmootherLab } from "@/components/lessons/smoother/lab";
import { MapServerAnimation } from "@/components/lessons/map-server/animation";
import { MapServerLab } from "@/components/lessons/map-server/lab";
import { AmclAnimation } from "@/components/lessons/amcl/animation";
import { AmclLab } from "@/components/lessons/amcl/lab";
import { CostmapAnimation } from "@/components/lessons/costmap/animation";
import { CostmapLab } from "@/components/lessons/costmap/lab";
import { VoxelGridAnimation } from "@/components/lessons/voxel-grid/animation";
import { VoxelGridLab } from "@/components/lessons/voxel-grid/lab";
import { SmacAnimation } from "@/components/lessons/smac/animation";
import { SmacLab } from "@/components/lessons/smac/lab";
import { ThetaStarAnimation } from "@/components/lessons/theta-star/animation";
import { ThetaStarLab } from "@/components/lessons/theta-star/lab";
import { ConstrainedSmootherAnimation } from "@/components/lessons/constrained-smoother/animation";
import { ConstrainedSmootherLab } from "@/components/lessons/constrained-smoother/lab";
import { DwbAnimation } from "@/components/lessons/dwb/animation";
import { DwbLab } from "@/components/lessons/dwb/lab";
import { MppiAnimation } from "@/components/lessons/mppi/animation";
import { MppiLab } from "@/components/lessons/mppi/lab";
import { GracefulAnimation } from "@/components/lessons/graceful/animation";
import { GracefulLab } from "@/components/lessons/graceful/lab";
import { RotationShimAnimation } from "@/components/lessons/rotation-shim/animation";
import { RotationShimLab } from "@/components/lessons/rotation-shim/lab";
import { BehaviorsAnimation } from "@/components/lessons/behaviors/animation";
import { BehaviorsLab } from "@/components/lessons/behaviors/lab";
import { LifecycleAnimation } from "@/components/lessons/lifecycle/animation";
import { LifecycleLab } from "@/components/lessons/lifecycle/lab";
import { BringupAnimation } from "@/components/lessons/bringup/animation";
import { BringupLab } from "@/components/lessons/bringup/lab";
import { RouteAnimation } from "@/components/lessons/route/animation";
import { RouteLab } from "@/components/lessons/route/lab";
import { VelocitySmootherAnimation } from "@/components/lessons/velocity-smoother/animation";
import { VelocitySmootherLab } from "@/components/lessons/velocity-smoother/lab";
import { CollisionMonitorAnimation } from "@/components/lessons/collision-monitor/animation";
import { CollisionMonitorLab } from "@/components/lessons/collision-monitor/lab";
import { WaypointFollowerAnimation } from "@/components/lessons/waypoint-follower/animation";
import { WaypointFollowerLab } from "@/components/lessons/waypoint-follower/lab";
import { DockingAnimation } from "@/components/lessons/docking/animation";
import { DockingLab } from "@/components/lessons/docking/lab";
import { FollowingAnimation } from "@/components/lessons/following/animation";
import { FollowingLab } from "@/components/lessons/following/lab";
import { GyroskopAnimation } from "@/components/lessons/05_gyroskop/animation";
import { GyroskopLab } from "@/components/lessons/05_gyroskop/lab";
import { KalibrierungAnimation } from "@/components/lessons/04_kalibrierung/animation";
import { KalibrierungLab } from "@/components/lessons/04_kalibrierung/lab";
import { OdometrieAnimation } from "@/components/lessons/03_odometrie/animation";
import { OdometrieLab } from "@/components/lessons/03_odometrie/lab";
import { RadabstandAnimation } from "@/components/lessons/02_radabstand/animation";
import { RadabstandLab } from "@/components/lessons/02_radabstand/lab";
import { RadumfangAnimation } from "@/components/lessons/01_radumfang/animation";
import { RadumfangLab } from "@/components/lessons/01_radumfang/lab";
import type { LessonCopy } from "@/lib/lesson-copy";
import type { LessonLevel } from "@/lib/lesson-levels";

// Neues Kapitel:
// 1. Eintrag in lib/curriculum.ts
// 2. content/<track>/<id>-<slug>.md
// 3. Nur bei neuer Twin-Logik: components/lessons/<slug>/ und eine Zeile in lessonModules.

export type LessonModule = {
  Animation: ComponentType<{ title: string }>;
  Lab: ComponentType<{ copy: LessonCopy; nextHref?: string; level?: LessonLevel }>;
};

const lessonModules: Record<string, LessonModule> = {
  "autonom:radumfang": { Animation: RadumfangAnimation, Lab: RadumfangLab },
  "autonom:radabstand": { Animation: RadabstandAnimation, Lab: RadabstandLab },
  "autonom:odometrie": { Animation: OdometrieAnimation, Lab: OdometrieLab },
  "autonom:kalibrierung-drift": { Animation: KalibrierungAnimation, Lab: KalibrierungLab },
  "autonom:gyroskop": { Animation: GyroskopAnimation, Lab: GyroskopLab },
  "nav2:behavior-trees": { Animation: BehaviorTreesAnimation, Lab: BehaviorTreesLab },
  "nav2:planner": { Animation: PlannerAnimation, Lab: PlannerLab },
  "nav2:bt2": { Animation: Bt2Animation, Lab: Bt2Lab },
  "nav2:plugins": { Animation: PluginsAnimation, Lab: PluginsLab },
  "nav2:planer-controller": {
    Animation: PlanerControllerAnimation,
    Lab: PlanerControllerLab,
  },
  "nav2:map-server": { Animation: MapServerAnimation, Lab: MapServerLab },
  "nav2:amcl": { Animation: AmclAnimation, Lab: AmclLab },
  "nav2:costmap": { Animation: CostmapAnimation, Lab: CostmapLab },
  "nav2:voxel-grid": { Animation: VoxelGridAnimation, Lab: VoxelGridLab },
  "nav2:smac": { Animation: SmacAnimation, Lab: SmacLab },
  "nav2:theta-star": { Animation: ThetaStarAnimation, Lab: ThetaStarLab },
  "nav2:smoother": { Animation: SmootherAnimation, Lab: SmootherLab },
  "nav2:constrained-smoother": {
    Animation: ConstrainedSmootherAnimation,
    Lab: ConstrainedSmootherLab,
  },
  "nav2:dwb": { Animation: DwbAnimation, Lab: DwbLab },
  "nav2:mppi": { Animation: MppiAnimation, Lab: MppiLab },
  "nav2:graceful": { Animation: GracefulAnimation, Lab: GracefulLab },
  "nav2:rotation-shim": { Animation: RotationShimAnimation, Lab: RotationShimLab },
  "nav2:route": { Animation: RouteAnimation, Lab: RouteLab },
  "nav2:behaviors": { Animation: BehaviorsAnimation, Lab: BehaviorsLab },
  "nav2:velocity-smoother": {
    Animation: VelocitySmootherAnimation,
    Lab: VelocitySmootherLab,
  },
  "nav2:collision-monitor": {
    Animation: CollisionMonitorAnimation,
    Lab: CollisionMonitorLab,
  },
  "nav2:waypoint-follower": {
    Animation: WaypointFollowerAnimation,
    Lab: WaypointFollowerLab,
  },
  "nav2:docking": { Animation: DockingAnimation, Lab: DockingLab },
  "nav2:following": { Animation: FollowingAnimation, Lab: FollowingLab },
  "nav2:lifecycle": { Animation: LifecycleAnimation, Lab: LifecycleLab },
  "nav2:bringup": { Animation: BringupAnimation, Lab: BringupLab },
};

export function lessonModule(track: string, slug: string) {
  return lessonModules[`${track}:${slug}`] ?? null;
}

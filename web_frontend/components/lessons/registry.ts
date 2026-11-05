import type { ComponentType } from "react";
import { BehaviorTreesAnimation } from "@/components/lessons/behavior-trees/animation";
import { BehaviorTreesLab } from "@/components/lessons/behavior-trees/lab";
import { PlannerAnimation } from "@/components/lessons/planner/animation";
import { PlannerLab } from "@/components/lessons/planner/lab";
import { Bt2Animation } from "@/components/lessons/bt2/animation";
import { Bt2Lab } from "@/components/lessons/bt2/lab";
import { PluginsAnimation } from "@/components/lessons/plugins/animation";
import { PluginsLab } from "@/components/lessons/plugins/lab";
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
};

export function lessonModule(track: string, slug: string) {
  return lessonModules[`${track}:${slug}`] ?? null;
}

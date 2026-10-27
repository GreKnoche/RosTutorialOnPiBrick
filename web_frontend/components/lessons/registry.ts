import type { ComponentType } from "react";
import { BehaviorTreesAnimation } from "@/components/lessons/behavior-trees/animation";
import { BehaviorTreesLab } from "@/components/lessons/behavior-trees/lab";
import { OdometrieAnimation } from "@/components/lessons/03_odometrie/animation";
import { OdometrieLab } from "@/components/lessons/03_odometrie/lab";
import { RadabstandAnimation } from "@/components/lessons/02_radabstand/animation";
import { RadabstandLab } from "@/components/lessons/02_radabstand/lab";
import { RadumfangAnimation } from "@/components/lessons/01_radumfang/animation";
import { RadumfangLab } from "@/components/lessons/01_radumfang/lab";
import type { LessonCopy } from "@/lib/lesson-copy";

// Neues Kapitel:
// 1. Eintrag in lib/curriculum.ts
// 2. content/<track>/<id>-<slug>.md
// 3. Nur bei neuer Twin-Logik: components/lessons/<slug>/ und eine Zeile in lessonModules.

export type LessonModule = {
  Animation: ComponentType<{ title: string }>;
  Lab: ComponentType<{ copy: LessonCopy; nextHref?: string }>;
};

const lessonModules: Record<string, LessonModule> = {
  "autonom:radumfang": { Animation: RadumfangAnimation, Lab: RadumfangLab },
  "autonom:radabstand": { Animation: RadabstandAnimation, Lab: RadabstandLab },
  "autonom:odometrie": { Animation: OdometrieAnimation, Lab: OdometrieLab },
  "nav2:behavior-trees": { Animation: BehaviorTreesAnimation, Lab: BehaviorTreesLab },
};

export function lessonModule(track: string, slug: string) {
  return lessonModules[`${track}:${slug}`] ?? null;
}

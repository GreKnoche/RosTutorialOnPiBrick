import type { ComponentType } from "react";
import { GyroskopAnimation } from "@/content/autonom/05-gyroskop/animation";
import { GyroskopLab } from "@/content/autonom/05-gyroskop/lab";
import { KalibrierungAnimation } from "@/content/autonom/04-kalibrierung-drift/animation";
import { KalibrierungLab } from "@/content/autonom/04-kalibrierung-drift/lab";
import { OdometrieAnimation } from "@/content/autonom/03-odometrie/animation";
import { OdometrieLab } from "@/content/autonom/03-odometrie/lab";
import { RadabstandAnimation } from "@/content/autonom/02-radabstand/animation";
import { RadabstandLab } from "@/content/autonom/02-radabstand/lab";
import { RadumfangAnimation } from "@/content/autonom/01-radumfang/animation";
import { RadumfangLab } from "@/content/autonom/01-radumfang/lab";
import type { LessonCopy } from "@/lib/lesson-copy";
import type { LessonLevel } from "@/lib/lesson-levels";

// Neues Kapitel:
// 1. Eintrag in content/catalog.json, oder über /studio
// 2. content/<track>/<id>-<slug>/copy.ts
// 3. Nur bei neuer Twin-Logik: animation.tsx und lab.tsx im selben Ordner, plus eine Zeile in lessonModules.

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
};

export function lessonModule(track: string, slug: string) {
  return lessonModules[`${track}:${slug}`] ?? null;
}

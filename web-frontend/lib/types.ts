export type LessonStatus = "ready" | "stub";
export type LabKind = "teleop" | "goal" | "none";
export type TrackId = "ros" | "nav2";

export type Crumb = { href?: string; label: string };

export type TrackMeta = {
  id: TrackId;
  title: string;
  description: string;
};

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  status: LessonStatus;
  summary: string;
  track: TrackId;
  lab: LabKind;
  nav2_surface?: string;
};

export type Curriculum = {
  tracks: TrackMeta[];
  lessons: Lesson[];
};

export type LabKind = "teleop" | "goal" | "none";
export type TrackId = "autonom" | "ros" | "nav2";

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
  summary: string;
  track: TrackId;
  lab: LabKind;
  taughtTerms?: string[];
};

export type Curriculum = {
  tracks: TrackMeta[];
  lessons: Lesson[];
};

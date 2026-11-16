import { LessonSection } from "@/components/lesson-section";
import { TrackLessons } from "@/components/track-lessons";

export const dynamic = "force-dynamic";

export default function AutonomPage() {
  return (
    <TrackLessons
      trackId="autonom"
      kicker="Themenkonzept · vom Rad zur autonomen Reaktion"
    >
      <LessonSection
        id="autonom-willkommen"
        eyebrow="Willkommen"
        title="Schritt für Schritt zum autonomen Roboter"
      >
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          Willkommen im Lernpfad zu den Grundlagen des autonomen Fahrens! Hier erforschst du direkt
          am Digital Twin – und optional am echten BrickPi3-Roboter –, wie ein mobiles Fahrzeug
          seine eigene Bewegung berechnet, Messfehler ausgleicht und auf seine Umgebung reagiert.
          Wähle links eine Station auf der Straße aus, um direkt in ein Kapitel einzusteigen.
        </p>
      </LessonSection>

      <LessonSection
        id="autonom-abstract"
        eyebrow="Abstract"
        title="Was in diesem Lernpfad passiert"
      >
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          Der Lernpfad führt dich von der einzelnen Radumdrehung bis zum geschlossenen Regelkreis.
          Zunächst bestimmst du über <strong>Radumfang</strong> und <strong>Radabstand</strong>, wie
          aus Raddrehungen gefahrene Strecken und Drehwinkel entstehen, und setzt beides in der{" "}
          <strong>Odometrie</strong> zu einer fortlaufenden Posenschätzung zusammen.
        </p>
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          Anschließend untersuchst du, warum die geschätzte Pose in der Realität vom echten Pfad
          abweicht: Du trennst systematische Parameterfehler durch <strong>Kalibrierung</strong> von
          zufälligem Schlupf (<strong>Drift</strong>) und stabilisierst die Richtungsschätzung mit
          einem <strong>Gyroskop</strong>. Zum Abschluss erfasst der Roboter Hindernisse per{" "}
          <strong>Ultraschall</strong> und verbindet Schätzen, Regeln und Reagieren zu einem ersten
          autonomen Verhalten.
        </p>
      </LessonSection>
    </TrackLessons>
  );
}

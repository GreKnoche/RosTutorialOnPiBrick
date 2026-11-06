import Link from "next/link";

export default function WelcomePage() {
  return (
    <article className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-10 py-12">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-heading sm:text-5xl">
          Willkommen beim Team von SmartDriving
        </h1>
        <p className="text-xl leading-snug">Schön, dass ihr das Einführungstutorial macht.</p>
      </header>
      <div className="flex flex-col gap-4 text-lg leading-relaxed">
        <p>Hier geht es um einen kleinen Roboter, der selbst fährt.</p>
        <p>
          Ihr beginnt bei den Rädern. Aus einer Umdrehung wird eine Strecke, aus zwei Rädern wird
          eine Drehung, und daraus merkt sich der Roboter, wo er steht.
        </p>
        <p>
          Danach kommt ROS 2. Die Teile des Roboters schicken sich darüber Nachrichten: Räder,
          Sensoren, Fahrbefehle.
        </p>
        <p>Zum Schluss plant Nav2 einen Weg und setzt ihn in eine Fahrt um.</p>
        <p>
          Ihr übt das zuerst am Bildschirm. Dieselben Ideen gelten danach für den Roboter auf dem
          Tisch.
        </p>
      </div>
      <div className="flex flex-col items-start gap-4">
        <Link
          href="/auswahl"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-lg font-medium text-primary-foreground hover:bg-primary/90"
        >
          Weiter
        </Link>
        <Link href="/lernpfade" className="text-base underline decoration-border underline-offset-4 hover:text-heading">
          Alle Lernpfade
        </Link>
      </div>
    </article>
  );
}

import { CityLab } from "@/components/city-lab";

export default function FreedrivePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl">Freedrive</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Freies Fahren in der Modellstadt. Wähle die Farbe des Twins, schalte den Nav2-Pfad ein und sieh
          daneben das Kamerabild von /camera/image_raw.
        </p>
      </div>
      <CityLab freedrive pathToggle cameraPane defaultCamera />
    </div>
  );
}
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tracks = [
  {
    href: "/ros",
    id: "ros",
    title: "ROS",
    description: "ROS 2 auf dem Companion-PC, BrickPi3 auf dem Raspberry Pi.",
  },
  {
    href: "/nav2",
    id: "nav2",
    title: "Nav2",
    description: "Navigation mit Nav2, Mapping und Gazebo.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          ROS 2 Jazzy · BrickPi3 · Gazebo
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-heading sm:text-4xl">
          Tutorials
        </h1>
      </section>

      <ol className="grid gap-3 sm:grid-cols-2">
        {tracks.map((track) => (
          <li key={track.id}>
            <Link href={track.href} className="block h-full">
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="font-heading text-xl">{track.title}</CardTitle>
                  <CardDescription>{track.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline">{track.id}</Badge>
                  <ArrowRight className="size-4 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

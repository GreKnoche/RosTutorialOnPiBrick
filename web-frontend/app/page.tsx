import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardIconPlaceholder } from "@/components/card-icon-placeholder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCurriculum, trackHref } from "@/lib/curriculum";

export default function HomePage() {
  const { tracks } = loadCurriculum();

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
            <Link href={trackHref(track.id)} className="block h-full">
              <Card className="h-full flex-row items-start gap-3 px-(--card-spacing) transition-colors hover:bg-muted/40">
                <CardIconPlaceholder />
                <div className="min-w-0 flex-1">
                  <CardHeader className="px-0">
                    <CardTitle className="font-heading text-xl">{track.title}</CardTitle>
                    <CardDescription>{track.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between px-0 text-xs text-muted-foreground">
                    <Badge variant="outline">{track.id}</Badge>
                    <ArrowRight className="size-4 shrink-0" />
                  </CardContent>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CardIconPlaceholder({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground/70",
        className
      )}
    >
      <ImageIcon className="size-5" />
    </span>
  );
}

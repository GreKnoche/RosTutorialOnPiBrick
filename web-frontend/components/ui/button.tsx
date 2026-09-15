import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "outline",
  size = "sm",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "outline" | "default";
  size?: "sm" | "default";
}) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border font-medium whitespace-nowrap transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-7 px-2.5 text-[0.8rem]",
        size === "default" && "h-8 px-2.5 text-sm",
        variant === "outline" && "border-border bg-background",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        className
      )}
      {...props}
    />
  );
}

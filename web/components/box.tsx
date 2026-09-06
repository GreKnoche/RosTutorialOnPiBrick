import Link from "next/link";
import type { ReactNode } from "react";

const boxClassName =
  "flex flex-col rounded-2xl border border-border bg-card p-8 text-card-foreground transition hover:border-heading";

type BoxProps = {
  href?: string;
  className?: string;
  children: ReactNode;
};

export function Box({ href, className, children }: BoxProps) {
  const classes = className ? `${boxClassName} ${className}` : boxClassName;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}

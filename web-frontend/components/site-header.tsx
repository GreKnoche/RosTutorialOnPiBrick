"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrickWall } from "lucide-react";

const links = [
  { href: "/", label: "Start" },
  { href: "/ros", label: "ROS" },
  { href: "/nav2", label: "Nav2" },
];

function linkActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border/80 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BrickWall className="size-4" />
          </span>
          <span className="tracking-tight">EV3 Nav2 Lab</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground${
                linkActive(link.href, pathname) ? " bg-secondary text-heading" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

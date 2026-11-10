"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/logo-mark";
import { resetBrowserStore } from "@/lib/browser-draft";

const links = [
  { href: "/lernpfade", label: "Start" },
  { href: "/autonom", label: "Autonom" },
  { href: "/ros", label: "ROS 2" },
  { href: "/nav2", label: "Nav2" },
];

function linkActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <header className="border-b border-border/80 bg-background/80 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/lernpfade" className="flex items-center gap-3 font-medium">
          <BrandLogo className="size-11" />
          <span className="text-lg tracking-tight">EV3-Nav2-Labor</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm">
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
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Fortschritt und Knotencode im Browser löschen?")) return;
              resetBrowserStore();
            }}
            className="ml-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Debug-Reset
          </button>
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { BrandLogo } from "@/components/logo-mark";
import { resetBrowserStore } from "@/lib/browser-draft";
import { setDebugAdmin, useDebugAdmin } from "@/lib/debug-admin";

const links = [
  { href: "/lernpfade", label: "Start" },
  { href: "/autonom", label: "Autonom" },
  { href: "/ros", label: "ROS 2" },
  { href: "/nav2", label: "Nav2" },
  { href: "/freedrive", label: "Freedrive" },
  { href: "/studio", label: "Studio" },
];

function linkActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DebugAccess() {
  const admin = useDebugAdmin();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const userId = useId();
  const passwordId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function login(event: FormEvent) {
    event.preventDefault();
    if (user.trim() === "admin" && password === "admin") {
      setDebugAdmin(true);
      setOpen(false);
      setWrong(false);
      setUser("");
      setPassword("");
      return;
    }
    setWrong(true);
  }

  function logout() {
    setDebugAdmin(false);
  }

  if (admin) {
    return (
      <div className="ml-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("Fortschritt und Knotencode im Browser löschen?")) return;
            resetBrowserStore();
          }}
          className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Debug-Reset
        </button>
        <button
          type="button"
          onClick={logout}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="relative ml-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted"
      >
        Login
      </button>
      {open ? (
        <form
          onSubmit={login}
          autoComplete="off"
          className="absolute top-full right-0 z-30 mt-2 w-56 rounded-lg border border-border bg-card p-3 shadow-sm"
        >
          <label htmlFor={userId} className="block text-xs text-muted-foreground">
            Benutzer
          </label>
          <input
            id={userId}
            value={user}
            autoFocus
            autoComplete="off"
            onChange={(event) => {
              setUser(event.target.value);
              setWrong(false);
            }}
            className="mt-1 mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
          <label htmlFor={passwordId} className="block text-xs text-muted-foreground">
            Passwort
          </label>
          <input
            id={passwordId}
            type="password"
            value={password}
            autoComplete="off"
            onChange={(event) => {
              setPassword(event.target.value);
              setWrong(false);
            }}
            className="mt-1 mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
          {wrong ? <p className="mb-2 text-xs text-destructive">Passt nicht.</p> : null}
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-2 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Anmelden
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <header className="relative z-30 border-b border-border/80 bg-background/80 backdrop-blur">
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
          <DebugAccess />
        </nav>
      </div>
    </header>
  );
}

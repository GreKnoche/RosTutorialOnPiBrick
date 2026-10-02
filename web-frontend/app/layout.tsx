import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const missionDisplay = Oswald({
  variable: "--font-mission",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "EV3-Nav2-Labor",
  description:
    "Interaktiver Nav2-Lernpfad: ROS 2 auf einem Begleitrechner und BrickPi3 auf einem Raspberry Pi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} ${missionDisplay.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

import { TRACK_CAR } from "@/lib/track-car";
import type { TrackId } from "@/lib/types";

export function PathIcon({ id, className = "size-8" }: { id: TrackId; className?: string }) {
  const color = TRACK_CAR[id];
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={`shrink-0 ${className}`}>
      {id === "autonom" && (
        <>
          <rect x="4" y="11" width="6" height="10" rx="1.5" fill={color} />
          <rect x="22" y="11" width="6" height="10" rx="1.5" fill={color} />
          <rect x="11" y="8" width="10" height="16" rx="2" fill={color} />
        </>
      )}
      {id === "ros" && (
        <>
          <rect x="5" y="6" width="22" height="20" rx="3" fill="none" stroke={color} strokeWidth="2.4" />
          <circle cx="16" cy="16" r="5" fill={color} />
        </>
      )}
      {id === "nav2" && (
        <>
          <path d="M5 8h16M5 15h16M5 22h16M5 8v14M11 8v14M17 8v14" stroke={color} strokeWidth="1.5" />
          <path d="M7 20c4-7 7-8 12-11" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="24" cy="8" r="3" fill={color} />
        </>
      )}
    </svg>
  );
}

export function TwinStamp({ className = "size-12" }: { className?: string }) {
  const twinScale = 1.4;
  return (
    <span
      aria-label="erledigt"
      title="erledigt"
      className={`inline-flex shrink-0 -rotate-12 items-center justify-center ${className}`}
    >
      <svg viewBox="0 0 64 64" className="size-full" aria-hidden>
        <circle cx="32" cy="32" r="29" fill="#e5f6eb" stroke="#1c8c46" strokeWidth="2.25" />
        <circle cx="32" cy="32" r="25" fill="none" stroke="#1c8c46" strokeWidth="1.15" opacity="0.55" />
        <path
          d="M15 33.5 26 45 50 18"
          fill="none"
          stroke="#1c8c46"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g transform={`translate(32 32) scale(${twinScale})`}>
          <rect x="-3.2" y="-8.6" width="6.6" height="2.5" rx="0.5" fill="#111318" />
          <rect x="-3.2" y="6.1" width="6.6" height="2.5" rx="0.5" fill="#111318" />
          <rect x="-6.4" y="-5.6" width="11.4" height="11.2" rx="1.5" fill="#e11d2e" stroke="#fff7ed" strokeWidth="0.7" />
          <path d="M7.6 0 3.4 -3.4v6.8z" fill="#fff7ed" />
        </g>
      </svg>
    </span>
  );
}

const road = "M22 70 L22 56.1 A34.1 34.1 0 0 1 56.1 22 L72 22";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 ${className ?? "size-11"}`}>
      <svg viewBox="0 0 64 64" className="size-full" overflow="hidden" aria-hidden>
        <rect width="64" height="64" fill="#0e6bc4" />
        <path d={road} fill="none" stroke="#f7f8fa" strokeWidth="20" strokeLinecap="butt" />
        <path d={road} fill="none" stroke="#2a2e34" strokeWidth="14.6" strokeLinecap="butt" />
        <path
          d={road}
          fill="none"
          stroke="#f7f8fa"
          strokeWidth="2.5"
          strokeLinecap="butt"
          strokeDasharray="5.4 4"
        />
        <g transform="translate(32 32) rotate(-45)">
          <rect x="-5" y="-8.6" width="10" height="3.2" rx="0.7" fill="#141414" />
          <rect x="-5" y="5.4" width="10" height="3.2" rx="0.7" fill="#141414" />
          <rect x="-11" y="-5.2" width="19" height="10.4" rx="2.2" fill="#e11d2e" stroke="#fff7ed" strokeWidth="1" />
          <path d="M12.2 0 6.4-3.6v7.2z" fill="#fff7ed" />
        </g>
      </svg>
    </span>
  );
}

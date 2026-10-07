export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 9.5c4-4.5 10-4.5 14 0" />
      <path d="M8 15 9.5 11.5h5L16 15" />
      <path d="M4.5 15h15v3H4.5z" />
      <circle cx="8.2" cy="20.6" r="1.55" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="20.6" r="1.55" fill="currentColor" stroke="none" />
    </svg>
  );
}

const twinScale = 1.4;

export function TwinStamp({ className = "size-12" }: { className?: string }) {
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

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-lg bg-heading text-background ${className ?? ""}`}
    >
      <LogoMark className="size-[68%]" />
    </span>
  );
}

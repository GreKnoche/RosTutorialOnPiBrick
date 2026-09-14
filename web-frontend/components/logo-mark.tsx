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

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-lg bg-heading text-background ${className ?? ""}`}
    >
      <LogoMark className="size-[68%]" />
    </span>
  );
}

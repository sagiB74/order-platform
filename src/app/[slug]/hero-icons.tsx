// Hand-drawn line-art marks for the storefront hero's decorative layer.
// Inline SVG (no emoji, per the design guidelines) — same convention as
// TrashIcon in src/app/dashboard/products/page.tsx. Purely decorative: every
// icon is aria-hidden and inherits its color via `stroke="currentColor"`
// (or `fill="currentColor"` for the two solid ones), so a parent's text color
// controls the whole set at once.
type IconProps = { className?: string };

const strokeProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function PipingBagIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <path d="M4 3h15l-6.2 10.6a3 3 0 0 1-2.6 1.5H9.2a3 3 0 0 1-2.6-1.5L2.9 6.7z" />
      <path d="M10.3 15.1v3.2a1.7 1.7 0 0 0 3.4 0v-3.2" />
      <path d="M7 6.5h8" />
    </svg>
  );
}

export function WhiskIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <path d="M15.5 3.2 19 6.7" />
      <path d="M13 5.5 5.8 12.7" />
      <path d="M13.6 6.2C10 8 7.4 11.4 6.4 15.2" />
      <path d="M15.3 8C11.7 9.7 8.9 13 7.7 16.7" />
      <path d="M17 9.7c-3.6 1.6-6.5 4.7-7.9 8.3" />
      <path d="M4.2 15.6a3.2 3.2 0 0 0 4.4 4.4" />
    </svg>
  );
}

export function CupcakeIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <path d="M6 12h12l-1.4 8.2a1.6 1.6 0 0 1-1.6 1.3H9a1.6 1.6 0 0 1-1.6-1.3z" />
      <path d="M9.6 13.4l-.7 6.8M14.4 13.4l.7 6.8" />
      <path d="M6.6 12a3.1 3.1 0 0 1 1.8-5.2 3.6 3.6 0 0 1 7.2 0A3.1 3.1 0 0 1 17.4 12" />
      <circle cx="12" cy="3.4" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CakeSliceIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <path d="M3.2 18.6 12 5l8.8 13.6z" />
      <path d="M6.4 13.5h11.2M8.2 16.2h7.6" />
    </svg>
  );
}

export function MeasuringCupIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <path d="M4 7h13v7.5a4.5 4.5 0 0 1-4.5 4.5H8.5A4.5 4.5 0 0 1 4 14.5z" />
      <path d="M17 9.2h1.9a2.2 2.2 0 0 1 0 4.4H17" />
      <path d="M6.5 10h3M6.5 13h3" />
    </svg>
  );
}

export function DotGridIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      {[0, 1, 2, 3].flatMap((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle key={`${row}-${col}`} cx={3 + col * 6} cy={3 + row * 6} r={0.9} />
        )),
      )}
    </svg>
  );
}

export function PlusMark({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 20.3 4.6 13a4.4 4.4 0 0 1 6.2-6.2l1.2 1.2 1.2-1.2A4.4 4.4 0 0 1 19.4 13z" />
    </svg>
  );
}

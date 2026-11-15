/** One stroke family (1.75, round caps) for every icon in the app. */
const paths = {
  play: <path d="M8 5.5v13l10-6.5-10-6.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2h2" />
    </>
  ),
  undo: <path d="M9 7L4.5 11.5 9 16M5 11.5h9a5 5 0 010 10h-2" />,
  out: <path d="M6 6l12 12M18 6L6 18" />,
  external: <path d="M14 5h5v5M19 5l-8 8M17 14v4a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 015 18V8.5A1.5 1.5 0 016.5 7H10" />,
  upload: <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M5 19h14" />,
  speaker: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="14.5" r="3.5" />
      <circle cx="12" cy="7.5" r="1.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  );
}

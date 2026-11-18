// Small shared UI bits: icons and class names for buttons and inputs.

export const inputClass =
  "h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink placeholder:text-muted/70 outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent/40";

export const primaryButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink active:scale-[0.98] disabled:opacity-60 transition";

export const secondaryButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 font-medium text-ink active:scale-[0.98] transition";

export const iconButtonClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink active:bg-surface-2 transition";

type IconProps = { className?: string };

function Svg({ className = "size-5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const MinusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const BackIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
);
export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
);
export const ChevronIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

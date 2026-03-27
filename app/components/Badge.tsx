interface BadgeProps {
  variant: "new" | "discount" | "chip";
  children: React.ReactNode;
}

const styles: Record<BadgeProps["variant"], string> = {
  new: "bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] border-[var(--accent-orange)]/25",
  discount: "bg-[var(--accent-green)] text-white border-[var(--accent-green)] shadow-sm shadow-[var(--accent-green)]/30",
  chip: "bg-[var(--surface-secondary)] text-[var(--fg)] border-[var(--border)]",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-[5px] rounded-full text-[11px] leading-none font-semibold border ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

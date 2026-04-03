interface BadgeProps {
  variant: "new" | "discount" | "chip" | "line";
  children: React.ReactNode;
}

const styles: Record<BadgeProps["variant"], string> = {
  new: "bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/18",
  discount: "bg-emerald-500 text-white border-transparent dark:bg-emerald-400",
  chip: "bg-[var(--surface-secondary)] text-[var(--fg)] border-[var(--border)]",
  line: "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20",
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

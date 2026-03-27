interface BadgeProps {
  variant: "new" | "discount" | "chip";
  children: React.ReactNode;
}

const styles: Record<BadgeProps["variant"], string> = {
  new: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-soft)]",
  discount: "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30",
  chip: "bg-purple-500/20 text-purple-600 border-purple-500/30 dark:text-purple-400",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

interface BadgeProps {
  variant: "new" | "discount";
  children: React.ReactNode;
}

const styles: Record<BadgeProps["variant"], string> = {
  new: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-soft)]",
  discount: "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30",
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

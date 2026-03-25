interface BadgeProps {
  variant: "new" | "discount" | "chip";
  children: React.ReactNode;
}

const styles: Record<BadgeProps["variant"], string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  discount: "bg-green-500/20 text-green-400 border-green-500/30",
  chip: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

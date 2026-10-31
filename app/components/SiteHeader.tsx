import type { ReactNode } from "react";

interface SiteHeaderProps {
  actions: ReactNode;
  // Catégories et recherche, fournies par le catalogue quand il est affiché.
  children?: ReactNode;
}

export function SiteHeader({ actions, children }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]/60 bg-[var(--surface)]/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 lg:flex-nowrap">
        <span className="shrink-0 text-[17px] font-semibold tracking-[-0.2px]">Refurb Monitor</span>
        <div className="order-3 flex w-full min-w-0 items-center gap-3 lg:order-2 lg:w-auto lg:flex-1">
          {children}
        </div>
        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-3 lg:ml-0">{actions}</div>
      </div>
    </header>
  );
}

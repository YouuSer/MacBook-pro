"use client";

import type { ReactNode } from "react";
import type { FamilyGroup } from "@/lib/catalog-view";
import type { Product } from "@/lib/types";

interface FamilySectionProps {
  group: FamilyGroup;
  expandExpired: boolean;
  renderCard: (product: Product, isExpired: boolean) => ReactNode;
}

export function FamilySection({ group, expandExpired, renderCard }: FamilySectionProps) {
  const headingId = `family-${group.productLine}`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
          {group.label}
        </h2>
        <span className="text-sm text-[var(--text-secondary)]">
          {group.available.length} disponible{group.available.length > 1 ? "s" : ""}
          {group.expired.length > 0 &&
            ` · ${group.expired.length} expirée${group.expired.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {group.available.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {group.available.map((product) => renderCard(product, false))}
        </div>
      )}

      {group.expired.length > 0 && (
        <details
          key={String(expandExpired || group.available.length === 0)}
          open={expandExpired || group.available.length === 0}
          className="group/expired mt-4"
        >
          <summary className="cursor-pointer list-none text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--fg)]">
            <span className="inline-block transition-transform group-open/expired:rotate-90" aria-hidden>
              ›
            </span>{" "}
            Offres expirées ({group.expired.length})
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {group.expired.map((product) => renderCard(product, true))}
          </div>
        </details>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ScrapeState = "idle" | "success" | "error";

export function ScrapeButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ScrapeState>("idle");

  useEffect(() => {
    if (state === "idle" || isPending) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setState("idle");
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [state, isPending]);

  async function handleClick() {
    if (isPending) {
      return;
    }

    setState("idle");

    try {
      const response = await fetch("/api/scrape", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | { success?: boolean; error?: string; trackedProductCount?: number }
        | undefined;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Scrape impossible");
      }

      setState("success");

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setState("error");
      console.error("Manual scrape failed", error);
    }
  }

  const iconClass =
    state === "success"
      ? "text-[var(--accent-green)] border-[var(--accent-green)]/30"
      : state === "error"
        ? "text-[var(--accent-red)] border-[var(--accent-red)]/30"
        : "text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--fg)]";

  const label = isPending
    ? "Scan en cours"
    : state === "success"
      ? "Dernier scan réussi"
      : state === "error"
        ? "Le scan a échoué"
        : "Déclencher un scrape";

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`p-2 rounded-full border transition-all disabled:cursor-wait ${iconClass}`}
      aria-label={label}
      title={label}
    >
      {isPending ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      ) : state === "success" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : state === "error" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      )}
    </button>
  );
}

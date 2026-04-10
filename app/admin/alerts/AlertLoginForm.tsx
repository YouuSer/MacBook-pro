"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AlertLoginForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Connexion impossible.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-semibold text-[var(--fg)]">
        Accès administrateur
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Entrez le token configuré côté serveur pour gérer les règles d&apos;alerte.
      </p>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Token
          </span>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            placeholder="ALERTS_ADMIN_TOKEN"
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full bg-[var(--accent-blue)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-blue-hover)] disabled:cursor-wait disabled:opacity-70"
        >
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

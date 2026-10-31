import Link from "next/link";
import { hasAdminSession, isAdminTokenConfigured } from "@/lib/admin-auth";
import { AlertLoginForm } from "./AlertLoginForm";
import { AdminAlertsClient } from "./AdminAlertsClient";
import { AdminFavoritesClient } from "./AdminFavoritesClient";

export const dynamic = "force-dynamic";

export default async function AdminAlertsPage() {
  const tokenConfigured = isAdminTokenConfigured();
  const authenticated = tokenConfigured ? await hasAdminSession() : false;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--fg)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Retour au site
        </Link>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-blue)]">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--fg)]">
            Alertes et favoris
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">
            Gérez les règles webhook génériques, les favoris de configuration et
            leurs notifications dédiées.
          </p>
        </div>
      </div>

      {!tokenConfigured ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/8 px-6 py-5">
          <p className="text-sm font-semibold text-[var(--fg)]">
            Configuration incomplète
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Définissez `ALERTS_ADMIN_TOKEN` pour activer l&apos;administration
            des alertes.
          </p>
        </div>
      ) : authenticated ? (
        <div className="space-y-8">
          <AdminAlertsClient />
          <AdminFavoritesClient />
        </div>
      ) : (
        <AlertLoginForm />
      )}
    </main>
  );
}

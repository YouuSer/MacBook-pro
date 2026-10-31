"use client";

import { useEffect, useState } from "react";
import {
  FAVORITE_EVENT_TYPES,
  getDefaultFavoriteNotificationSettings,
  getFavoriteEventLabel,
  getFavoriteStateLabel,
  type FavoriteEventType,
  type FavoriteNotificationSettingsValues,
} from "@/lib/favorites";
import type {
  FavoriteConfig,
  FavoriteEvent,
  FavoriteNotificationSettings,
} from "@/lib/types";

interface AdminFavoritesResponse {
  favorites: FavoriteConfig[];
  events: FavoriteEvent[];
}

interface AdminFavoriteSettingsResponse {
  settings: FavoriteNotificationSettings;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[var(--fg)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function toggleStringInArray(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminFavoritesClient() {
  const [favorites, setFavorites] = useState<FavoriteConfig[]>([]);
  const [events, setEvents] = useState<FavoriteEvent[]>([]);
  const [settings, setSettings] = useState<FavoriteNotificationSettingsValues>(
    getDefaultFavoriteNotificationSettings()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingFavoriteId, setRemovingFavoriteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [favoritesResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/favorites", { cache: "no-store" }),
        fetch("/api/admin/favorites/settings", { cache: "no-store" }),
      ]);
      const favoritesPayload = (await favoritesResponse.json()) as
        | AdminFavoritesResponse
        | { error?: string };
      const settingsPayload = (await settingsResponse.json()) as
        | AdminFavoriteSettingsResponse
        | { error?: string };

      if (!favoritesResponse.ok || !("favorites" in favoritesPayload)) {
        throw new Error(
          "error" in favoritesPayload
            ? favoritesPayload.error
            : "Chargement impossible."
        );
      }

      if (!settingsResponse.ok || !("settings" in settingsPayload)) {
        throw new Error(
          "error" in settingsPayload
            ? settingsPayload.error
            : "Chargement impossible."
        );
      }

      setFavorites(favoritesPayload.favorites);
      setEvents(favoritesPayload.events);
      setSettings({
        enabled: settingsPayload.settings.enabled,
        channelType: settingsPayload.settings.channelType,
        webhookUrl: settingsPayload.settings.webhookUrl,
        triggers: settingsPayload.settings.triggers,
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Chargement impossible."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function saveSettings() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/favorites/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as
        | AdminFavoriteSettingsResponse
        | { error?: string };

      if (!response.ok || !("settings" in payload)) {
        throw new Error("error" in payload ? payload.error : "Enregistrement impossible.");
      }

      setSettings({
        enabled: payload.settings.enabled,
        channelType: payload.settings.channelType,
        webhookUrl: payload.settings.webhookUrl,
        triggers: payload.settings.triggers,
      });
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Enregistrement impossible."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeFavorite(favoriteId: number) {
    setRemovingFavoriteId(favoriteId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/favorites/${favoriteId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Suppression impossible.");
      }

      await loadData();
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "Suppression impossible."
      );
    } finally {
      setRemovingFavoriteId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <SectionCard
        title="Notifications favoris"
        description="Un webhook global pour les événements de réapparition, expiration et baisse de prix."
      >
        <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[var(--fg)]">
              Webhook favoris
            </p>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
              />
              Activé
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Canal
              </span>
              <select
                value={settings.channelType}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    channelType: event.target.value as FavoriteNotificationSettingsValues["channelType"],
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] outline-none transition-colors focus:border-[var(--accent-blue)]"
              >
                <option value="discord">Discord</option>
                <option value="slack">Slack</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Webhook URL
            </span>
            <input
              type="url"
              value={settings.webhookUrl}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  webhookUrl: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] outline-none transition-colors focus:border-[var(--accent-blue)]"
              placeholder="https://hooks.slack.com/... ou https://discord.com/api/webhooks/..."
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Déclencheurs
            </p>
            <div className="flex flex-wrap gap-2">
              {FAVORITE_EVENT_TYPES.map((trigger) => (
                <label
                  key={trigger}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--fg)]"
                >
                  <input
                    type="checkbox"
                    checked={settings.triggers.includes(trigger)}
                    onChange={() =>
                      setSettings((current) => ({
                        ...current,
                        triggers: toggleStringInArray(
                          current.triggers,
                          trigger
                        ) as FavoriteEventType[],
                      }))
                    }
                  />
                  {getFavoriteEventLabel(trigger)}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent-blue)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-blue-hover)] disabled:cursor-wait disabled:opacity-70"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Favoris suivis"
        description="Ajoutez ou retirez les favoris depuis la page d'accueil, puis surveillez ici leur état courant."
      >
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Chargement...</p>
        ) : favorites.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Aucun favori pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border)] px-4 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        favorite.currentState === "available"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-neutral-500/10 text-[var(--text-secondary)]"
                      }`}
                    >
                      {getFavoriteStateLabel(favorite.currentState)}
                    </span>
                    <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                      {favorite.currentMatchCount} SKU actif
                      {favorite.currentMatchCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--fg)]">
                    {favorite.label}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Référence source {favorite.sourcePartNumber}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Dernier match {formatDateTime(favorite.lastMatchedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeFavorite(favorite.id)}
                  disabled={removingFavoriteId === favorite.id}
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--fg)] transition-colors hover:border-[var(--border-hover)] disabled:cursor-wait disabled:opacity-70"
                >
                  {removingFavoriteId === favorite.id ? "Suppression..." : "Retirer"}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Journal des favoris"
        description="Historique récent des événements et du statut de livraison webhook."
      >
        {events.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Aucun événement enregistré pour le moment.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface-secondary)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Événement
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Produit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr
                    key={event.id}
                    className={index % 2 === 0 ? "" : "bg-[var(--surface-secondary)]/50"}
                  >
                    <td className="px-4 py-3 text-xs text-[var(--fg)]">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--fg)]">
                      {getFavoriteEventLabel(event.eventType)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--fg)]">
                      <div>{event.productTitle}</div>
                      <div className="mt-1 text-[var(--text-secondary)]">
                        {event.partNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--fg)]">
                      {event.deliveryStatus === "success"
                        ? "Webhook envoyé"
                        : event.deliveryStatus === "error"
                          ? "Webhook en erreur"
                          : "Sans webhook"}
                      {event.deliveryError && (
                        <div className="mt-1 text-red-600 dark:text-red-400">
                          {event.deliveryError}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

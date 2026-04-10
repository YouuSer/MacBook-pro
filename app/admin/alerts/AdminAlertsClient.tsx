"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ALERT_TRIGGER_TYPES,
  getDefaultAlertRuleValues,
  getProductLineLabelForAlert,
  type AlertDelivery,
  type AlertRule,
  type AlertRuleValues,
  type AlertTrigger,
} from "@/lib/alerts";
import {
  formatScreenSize,
  type ProductLine,
} from "@/lib/product-catalog";
import type { ProductFilterOptions } from "@/lib/product-filters";

interface AdminAlertsResponse {
  rules: AlertRule[];
  options: ProductFilterOptions;
  deliveries: AlertDelivery[];
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

function TriggerCheckbox({
  trigger,
  selected,
  onToggle,
}: {
  trigger: AlertTrigger;
  selected: boolean;
  onToggle: (trigger: AlertTrigger) => void;
}) {
  const label = trigger === "new_match" ? "Nouveau match" : "Baisse de prix";

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--fg)]">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(trigger)}
      />
      {label}
    </label>
  );
}

function OptionPills({
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  renderLabel?: (value: string) => string;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-[var(--text-tertiary)]">
        Aucune option détectée pour le moment.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active
                ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                : "border-[var(--border)] text-[var(--fg)] hover:border-[var(--border-hover)]"
            }`}
          >
            {renderLabel ? renderLabel(option) : option}
          </button>
        );
      })}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  renderLabel?: (value: string) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </p>
      <OptionPills
        options={options}
        selected={selected}
        onToggle={onToggle}
        renderLabel={renderLabel}
      />
    </div>
  );
}

function toggleStringInArray(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

function AlertRuleEditor({
  title,
  values,
  options,
  submitLabel,
  busy,
  onChange,
  onSubmit,
}: {
  title: string;
  values: AlertRuleValues;
  options: ProductFilterOptions;
  submitLabel: string;
  busy: boolean;
  onChange: (next: AlertRuleValues) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-[var(--fg)]">{title}</p>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={values.enabled}
            onChange={(event) =>
              onChange({ ...values, enabled: event.target.checked })
            }
          />
          Activée
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Nom
          </span>
          <input
            type="text"
            value={values.name}
            onChange={(event) =>
              onChange({ ...values, name: event.target.value })
            }
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            placeholder="Ex. M4 Pro 16 Go"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Canal
          </span>
          <select
            value={values.channelType}
            onChange={(event) =>
              onChange({
                ...values,
                channelType: event.target.value as AlertRuleValues["channelType"],
              })
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
          value={values.webhookUrl}
          onChange={(event) =>
            onChange({ ...values, webhookUrl: event.target.value })
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
          {ALERT_TRIGGER_TYPES.map((trigger) => (
            <TriggerCheckbox
              key={trigger}
              trigger={trigger}
              selected={values.triggers.includes(trigger)}
              onToggle={(nextTrigger) =>
                onChange({
                  ...values,
                  triggers: toggleStringInArray(
                    values.triggers,
                    nextTrigger
                  ) as AlertTrigger[],
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FilterGroup
          label="Gamme"
          options={options.productLines}
          selected={values.filters.productLines}
          onToggle={(value) =>
            onChange({
              ...values,
              filters: {
                ...values.filters,
                productLines: toggleStringInArray(
                  values.filters.productLines,
                  value
                ) as ProductLine[],
              },
            })
          }
          renderLabel={(value) => getProductLineLabelForAlert(value as ProductLine)}
        />
        <FilterGroup
          label="Puce"
          options={options.chips}
          selected={values.filters.chips}
          onToggle={(value) =>
            onChange({
              ...values,
              filters: {
                ...values.filters,
                chips: toggleStringInArray(values.filters.chips, value),
              },
            })
          }
        />
        <FilterGroup
          label="RAM"
          options={options.memories}
          selected={values.filters.memories}
          onToggle={(value) =>
            onChange({
              ...values,
              filters: {
                ...values.filters,
                memories: toggleStringInArray(values.filters.memories, value),
              },
            })
          }
        />
        <FilterGroup
          label="Stockage"
          options={options.storages}
          selected={values.filters.storages}
          onToggle={(value) =>
            onChange({
              ...values,
              filters: {
                ...values.filters,
                storages: toggleStringInArray(values.filters.storages, value),
              },
            })
          }
        />
        <div className="lg:col-span-2">
          <FilterGroup
            label="Écran"
            options={options.screenSizes}
            selected={values.filters.screenSizes}
            onToggle={(value) =>
              onChange({
                ...values,
                filters: {
                  ...values.filters,
                  screenSizes: toggleStringInArray(
                    values.filters.screenSizes,
                    value
                  ),
                },
              })
            }
            renderLabel={(value) => formatScreenSize(value) ?? value}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-full bg-[var(--accent-blue)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-blue-hover)] disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "Enregistrement..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

export function AdminAlertsClient() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [options, setOptions] = useState<ProductFilterOptions>({
    productLines: [],
    chips: [],
    memories: [],
    storages: [],
    screenSizes: [],
  });
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [draft, setDraft] = useState<AlertRuleValues>(getDefaultAlertRuleValues());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/alerts", {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | AdminAlertsResponse
        | { error?: string; code?: string };

      if (!response.ok || !("rules" in payload)) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message ?? "Chargement impossible.");
      }

      setRules(payload.rules);
      setOptions(payload.options);
      setDeliveries(payload.deliveries);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Chargement impossible.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createRule() {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as
        | { rule?: AlertRule; error?: string }
        | undefined;

      if (!response.ok || !payload?.rule) {
        throw new Error(payload?.error ?? "Création impossible.");
      }

      setDraft(getDefaultAlertRuleValues());
      await loadData();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Création impossible.";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  async function saveRule(rule: AlertRule) {
    setSavingRuleId(rule.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/alerts/${rule.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: rule.name,
          enabled: rule.enabled,
          channelType: rule.channelType,
          webhookUrl: rule.webhookUrl,
          triggers: rule.triggers,
          filters: rule.filters,
        }),
      });
      const payload = (await response.json()) as
        | { rule?: AlertRule; error?: string }
        | undefined;

      if (!response.ok || !payload?.rule) {
        throw new Error(payload?.error ?? "Enregistrement impossible.");
      }

      setRules((current) =>
        current.map((entry) => (entry.id === payload.rule?.id ? payload.rule : entry))
      );
      await loadData();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Enregistrement impossible.";
      setError(message);
    } finally {
      setSavingRuleId(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    startLogoutTransition(() => {
      window.location.reload();
    });
  }

  function updateRule(ruleId: number, next: AlertRuleValues) {
    setRules((current) =>
      current.map((rule) =>
        rule.id === ruleId ? { ...rule, ...next } : rule
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-[var(--text-secondary)]">
          {rules.length} règle{rules.length !== 1 ? "s" : ""} configurée
          {rules.length !== 1 ? "s" : ""}
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={isLoggingOut}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--fg)] transition-colors hover:border-[var(--border-hover)] disabled:cursor-wait disabled:opacity-70"
        >
          {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <SectionCard
        title="Nouvelle règle"
        description="Les filtres laissés vides correspondent à tous les produits."
      >
        <AlertRuleEditor
          title="Créer une règle"
          values={draft}
          options={options}
          submitLabel="Créer la règle"
          busy={creating}
          onChange={setDraft}
          onSubmit={createRule}
        />
      </SectionCard>

      <SectionCard
        title="Règles existantes"
        description="Modifiez les déclencheurs, le canal ou les filtres, puis enregistrez."
      >
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Chargement...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Aucune règle pour le moment.
          </p>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <AlertRuleEditor
                key={rule.id}
                title={rule.name || `Règle #${rule.id}`}
                values={rule}
                options={options}
                submitLabel="Enregistrer"
                busy={savingRuleId === rule.id}
                onChange={(next) => updateRule(rule.id, next)}
                onSubmit={() => saveRule(rule)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Dernières livraisons"
        description="Historique récent des notifications envoyées ou en erreur."
      >
        {deliveries.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Aucun envoi enregistré pour le moment.
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
                    Règle
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
                {deliveries.map((delivery, index) => (
                  <tr
                    key={delivery.id}
                    className={index % 2 === 0 ? "" : "bg-[var(--surface-secondary)]/50"}
                  >
                    <td className="px-4 py-3 text-xs text-[var(--fg)]">
                      {new Date(delivery.createdAt).toLocaleString("fr-FR", {
                        timeZone: "Europe/Paris",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--fg)]">
                      {delivery.ruleName}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--fg)]">
                      {delivery.eventType === "new_match"
                        ? "Nouveau match"
                        : "Baisse de prix"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--fg)]">
                      {delivery.productTitle}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          delivery.status === "success"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {delivery.status === "success"
                          ? "Envoyé"
                          : delivery.errorMessage ?? "Erreur"}
                      </span>
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

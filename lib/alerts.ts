import { type ProductLine } from "./product-catalog";
import {
  createEmptyProductFilters,
  matchesProductFilters,
  normalizeProductFilters,
  type ProductFilterMatchable,
  type ProductFilterValues,
} from "./product-filters";

const PRICE_EPSILON = 0.001;

export const ALERT_CHANNEL_TYPES = ["discord", "slack"] as const;
export const ALERT_TRIGGER_TYPES = ["new_match", "price_drop"] as const;
export const ALERT_DELIVERY_STATUSES = ["success", "error"] as const;

export type AlertChannelType = (typeof ALERT_CHANNEL_TYPES)[number];
export type AlertTrigger = (typeof ALERT_TRIGGER_TYPES)[number];
export type AlertDeliveryStatus = (typeof ALERT_DELIVERY_STATUSES)[number];

export interface AlertRuleValues {
  name: string;
  enabled: boolean;
  channelType: AlertChannelType;
  webhookUrl: string;
  triggers: AlertTrigger[];
  filters: ProductFilterValues;
}

export interface AlertRule extends AlertRuleValues {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRuleRow {
  id: number;
  name: string;
  enabled: boolean;
  channelType: string;
  webhookUrl: string;
  triggersJson: string;
  filtersJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertDelivery {
  id: number;
  ruleId: number;
  ruleName: string;
  partNumber: string;
  productTitle: string;
  eventType: AlertTrigger;
  currentPrice: number;
  previousPrice: number | null;
  status: AlertDeliveryStatus;
  errorMessage: string | null;
  scrapedAt: string;
  createdAt: string;
}

export interface AlertCandidate extends ProductFilterMatchable {
  eventType: AlertTrigger;
  partNumber: string;
  title: string;
  currentPrice: number;
  previousPrice: number | null;
  productUrl: string;
  imageUrl: string;
}

export interface ExistingTrackedProductSnapshot {
  currentPrice: number;
  lastSeen: string;
}

export interface ScrapedAlertProductSnapshot extends ProductFilterMatchable {
  partNumber: string;
  title: string;
  currentPrice: number;
  productUrl: string;
  imageUrl: string;
}

export interface AlertWebhookRequest {
  headers: Record<string, string>;
  body: string;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function isAlertChannelType(value: string): value is AlertChannelType {
  return ALERT_CHANNEL_TYPES.includes(value as AlertChannelType);
}

function isAlertTrigger(value: string): value is AlertTrigger {
  return ALERT_TRIGGER_TYPES.includes(value as AlertTrigger);
}

function normalizeAlertName(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Le nom de la règle est requis.");
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Le nom de la règle est requis.");
  }

  return normalized.slice(0, 120);
}

function normalizeAlertEnabled(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return true;
}

function normalizeAlertChannelType(value: unknown): AlertChannelType {
  if (typeof value !== "string" || !isAlertChannelType(value)) {
    throw new Error("Le canal doit être Discord ou Slack.");
  }

  return value;
}

function normalizeWebhookUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("L'URL du webhook est requise.");
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error("L'URL du webhook est requise.");
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("L'URL du webhook est invalide.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Le webhook doit utiliser HTTPS.");
  }

  return parsed.toString();
}

function normalizeTriggers(value: unknown): AlertTrigger[] {
  if (!Array.isArray(value)) {
    throw new Error("Sélectionnez au moins un déclencheur.");
  }

  const triggers = unique(
    value
      .filter((entry): entry is string => typeof entry === "string")
      .filter((entry): entry is AlertTrigger => isAlertTrigger(entry))
  );

  if (triggers.length === 0) {
    throw new Error("Sélectionnez au moins un déclencheur.");
  }

  return triggers;
}

export function getDefaultAlertRuleValues(): AlertRuleValues {
  return {
    name: "",
    enabled: true,
    channelType: "discord",
    webhookUrl: "",
    triggers: [...ALERT_TRIGGER_TYPES],
    filters: createEmptyProductFilters(),
  };
}

export function parseAlertRuleInput(value: unknown): AlertRuleValues {
  if (!value || typeof value !== "object") {
    throw new Error("Corps de requête invalide.");
  }

  const payload = value as Record<string, unknown>;

  return {
    name: normalizeAlertName(payload.name),
    enabled: normalizeAlertEnabled(payload.enabled),
    channelType: normalizeAlertChannelType(payload.channelType),
    webhookUrl: normalizeWebhookUrl(payload.webhookUrl),
    triggers: normalizeTriggers(payload.triggers),
    filters: normalizeProductFilters(
      payload.filters as Partial<ProductFilterValues> | undefined
    ),
  };
}

export function serializeAlertRuleValues(values: AlertRuleValues, now: string) {
  return {
    name: values.name,
    enabled: values.enabled,
    channelType: values.channelType,
    webhookUrl: values.webhookUrl,
    triggersJson: JSON.stringify(values.triggers),
    filtersJson: JSON.stringify(values.filters),
    createdAt: now,
    updatedAt: now,
  };
}

function safeParseArrayJson(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function safeParseFiltersJson(value: string): ProductFilterValues {
  try {
    return normalizeProductFilters(JSON.parse(value));
  } catch {
    return createEmptyProductFilters();
  }
}

export function parseAlertRuleRow(row: AlertRuleRow): AlertRule {
  const channelType = isAlertChannelType(row.channelType)
    ? row.channelType
    : "discord";

  const triggers = unique(
    safeParseArrayJson(row.triggersJson).filter((entry): entry is AlertTrigger =>
      isAlertTrigger(entry)
    )
  );

  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    channelType,
    webhookUrl: row.webhookUrl,
    triggers: triggers.length > 0 ? triggers : ["new_match"],
    filters: safeParseFiltersJson(row.filtersJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function isReappearingProduct(
  lastSeen: string | null | undefined,
  lastSuccessfulScrapedAt: string | null
) {
  if (!lastSeen || !lastSuccessfulScrapedAt) {
    return false;
  }

  return lastSeen < lastSuccessfulScrapedAt;
}

export function getAlertCandidateForScrapedProduct(args: {
  existingProduct?: ExistingTrackedProductSnapshot | null;
  scrapedProduct: ScrapedAlertProductSnapshot;
  lastSuccessfulScrapedAt: string | null;
}): AlertCandidate | null {
  const { existingProduct, scrapedProduct, lastSuccessfulScrapedAt } = args;
  const reappearing = isReappearingProduct(
    existingProduct?.lastSeen,
    lastSuccessfulScrapedAt
  );

  if (!existingProduct || reappearing) {
    return {
      eventType: "new_match",
      partNumber: scrapedProduct.partNumber,
      title: scrapedProduct.title,
      currentPrice: scrapedProduct.currentPrice,
      previousPrice: existingProduct?.currentPrice ?? null,
      productLine: scrapedProduct.productLine,
      chip: scrapedProduct.chip,
      memory: scrapedProduct.memory,
      storage: scrapedProduct.storage,
      screenSize: scrapedProduct.screenSize,
      productUrl: scrapedProduct.productUrl,
      imageUrl: scrapedProduct.imageUrl,
    };
  }

  if (scrapedProduct.currentPrice < existingProduct.currentPrice - PRICE_EPSILON) {
    return {
      eventType: "price_drop",
      partNumber: scrapedProduct.partNumber,
      title: scrapedProduct.title,
      currentPrice: scrapedProduct.currentPrice,
      previousPrice: existingProduct.currentPrice,
      productLine: scrapedProduct.productLine,
      chip: scrapedProduct.chip,
      memory: scrapedProduct.memory,
      storage: scrapedProduct.storage,
      screenSize: scrapedProduct.screenSize,
      productUrl: scrapedProduct.productUrl,
      imageUrl: scrapedProduct.imageUrl,
    };
  }

  return null;
}

export function ruleMatchesAlertCandidate(
  rule: Pick<AlertRule, "enabled" | "triggers" | "filters">,
  candidate: AlertCandidate
) {
  if (!rule.enabled) {
    return false;
  }

  if (!rule.triggers.includes(candidate.eventType)) {
    return false;
  }

  return matchesProductFilters(candidate, rule.filters);
}

function formatPrice(value: number) {
  return `${value.toLocaleString("fr-FR")} €`;
}

function getEventLabel(eventType: AlertTrigger) {
  return eventType === "new_match" ? "Nouveau match" : "Baisse de prix";
}

function getDiscordColor(eventType: AlertTrigger) {
  return eventType === "new_match" ? 0x0077ed : 0x34c759;
}

function getAlertDescription(rule: Pick<AlertRule, "name">, candidate: AlertCandidate) {
  if (candidate.eventType === "new_match") {
    return `La règle "${rule.name}" a trouvé un nouveau MacBook correspondant.`;
  }

  return `La règle "${rule.name}" a détecté une baisse de prix sur un MacBook surveillé.`;
}

export function buildAlertWebhookRequest(
  rule: Pick<AlertRule, "channelType" | "name">,
  candidate: AlertCandidate
): AlertWebhookRequest {
  const eventLabel = getEventLabel(candidate.eventType);
  const previousPriceLabel =
    candidate.previousPrice === null
      ? "—"
      : formatPrice(candidate.previousPrice);
  const currentPriceLabel = formatPrice(candidate.currentPrice);
  const summaryText =
    candidate.eventType === "new_match"
      ? `${eventLabel}: ${candidate.title} à ${currentPriceLabel}`
      : `${eventLabel}: ${candidate.title} de ${previousPriceLabel} à ${currentPriceLabel}`;

  if (rule.channelType === "slack") {
    return {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: summaryText,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${eventLabel} • ${rule.name}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${candidate.title}*\n${getAlertDescription(rule, candidate)}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Prix actuel*\n${currentPriceLabel}`,
              },
              {
                type: "mrkdwn",
                text: `*Prix précédent*\n${previousPriceLabel}`,
              },
              {
                type: "mrkdwn",
                text: `*Puce*\n${candidate.chip || "—"}`,
              },
              {
                type: "mrkdwn",
                text: `*Référence*\n${candidate.partNumber}`,
              },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Voir sur Apple",
                },
                url: candidate.productUrl,
              },
            ],
          },
        ],
      }),
    };
  }

  return {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: summaryText,
      embeds: [
        {
          title: `${eventLabel} • ${rule.name}`,
          url: candidate.productUrl,
          description: getAlertDescription(rule, candidate),
          color: getDiscordColor(candidate.eventType),
          fields: [
            {
              name: "Prix actuel",
              value: currentPriceLabel,
              inline: true,
            },
            {
              name: "Prix précédent",
              value: previousPriceLabel,
              inline: true,
            },
            {
              name: "Puce",
              value: candidate.chip || "—",
              inline: true,
            },
            {
              name: "Référence",
              value: candidate.partNumber,
              inline: true,
            },
          ],
          thumbnail: candidate.imageUrl ? { url: candidate.imageUrl } : undefined,
        },
      ],
    }),
  };
}

export function getProductLineLabelForAlert(productLine: ProductLine) {
  return productLine === "air" ? "Air" : "Pro";
}

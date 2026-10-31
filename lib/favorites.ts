import {
  ALERT_CHANNEL_TYPES,
  type AlertChannelType,
} from "./alerts";
import {
  normalizeAppleText,
  normalizeProductLine,
  normalizeScreenSize,
  parseCoreCounts,
  resolveProductLine,
  type ProductLine,
} from "./product-catalog";
import { normalizeFilterTextValue } from "./product-filters";

const PRICE_EPSILON = 0.001;

export const FAVORITE_STATES = ["available", "unavailable"] as const;
export const FAVORITE_EVENT_TYPES = [
  "reappearance",
  "expiration",
  "price_drop",
] as const;
export const FAVORITE_DELIVERY_STATUSES = ["success", "error"] as const;

export type FavoriteState = (typeof FAVORITE_STATES)[number];
export type FavoriteEventType = (typeof FAVORITE_EVENT_TYPES)[number];
export type FavoriteDeliveryStatus = (typeof FAVORITE_DELIVERY_STATUSES)[number];

export interface FavoriteConfigMatchable {
  title: string;
  partNumber: string;
  productLine: ProductLine;
  chip: string;
  screenSize: string;
  memory: string;
  storage: string;
  color: string;
  releaseYear: string;
}

export interface FavoriteProductMatch extends FavoriteConfigMatchable {
  currentPrice: number;
  lastSeen: string;
  productUrl: string;
  imageUrl: string;
}

export interface FavoriteTrackedProductRow {
  partNumber: string;
  title: string;
  currentPrice: number;
  productLine: string | null;
  chip: string | null;
  screenSize: string | null;
  memory: string | null;
  storage: string | null;
  color: string | null;
  releaseYear: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  lastSeen: string;
}

export interface FavoriteConfigIdentity {
  configKey: string;
  label: string;
  cpuCores: string;
  gpuCores: string;
  hasNanoTexture: boolean;
}

export interface FavoriteTransitionState {
  currentState: FavoriteState;
  bestCurrentPrice: number | null;
  sourcePartNumber: string;
  label: string;
}

export interface FavoriteEventCandidate {
  favoriteId: number;
  eventType: FavoriteEventType;
  partNumber: string;
  productTitle: string;
  currentPrice: number | null;
  previousPrice: number | null;
  productUrl: string | null;
  imageUrl: string | null;
}

export interface FavoriteNotificationSettingsValues {
  enabled: boolean;
  channelType: AlertChannelType;
  webhookUrl: string;
  triggers: FavoriteEventType[];
}

export interface FavoriteNotificationSettingsRow
  extends FavoriteNotificationSettingsValues {
  id: number;
  createdAt: string;
  updatedAt: string;
}

function normalizeFavoriteText(value: string) {
  return normalizeFilterTextValue(normalizeAppleText(value));
}

function normalizeColor(value: string) {
  return normalizeAppleText(value).trim().toLowerCase();
}

function normalizeReleaseYear(value: string) {
  const normalized = normalizeAppleText(value);
  const match = normalized.match(/\d{4}/);
  return match ? match[0] : normalized;
}

export function hasNanoTexture(value: string) {
  return /nano-?textur/i.test(normalizeAppleText(value));
}

export function buildFavoriteConfigIdentity(
  product: FavoriteConfigMatchable
): FavoriteConfigIdentity {
  const normalizedTitle = normalizeAppleText(product.title);
  const { cpuCores, gpuCores } = parseCoreCounts(normalizedTitle);
  const configParts = [
    normalizeProductLine(product.productLine) ?? product.productLine,
    normalizeFavoriteText(product.chip),
    normalizeScreenSize(product.screenSize),
    normalizeFavoriteText(product.memory),
    normalizeFavoriteText(product.storage),
    normalizeColor(product.color),
    normalizeReleaseYear(product.releaseYear),
    cpuCores,
    gpuCores,
    hasNanoTexture(normalizedTitle) ? "NANO" : "STANDARD",
  ];

  return {
    configKey: configParts.join("|"),
    label: normalizedTitle,
    cpuCores,
    gpuCores,
    hasNanoTexture: hasNanoTexture(normalizedTitle),
  };
}

export function buildFavoriteConfigKey(product: FavoriteConfigMatchable) {
  return buildFavoriteConfigIdentity(product).configKey;
}

// Les clés créées avant le multi-catégories commencent par "air|" ou "pro|".
export function normalizeFavoriteConfigKey(configKey: string) {
  const [productLine, ...rest] = configKey.split("|");
  return [normalizeProductLine(productLine) ?? productLine, ...rest].join("|");
}

export function matchesFavoriteConfig(
  product: FavoriteConfigMatchable,
  configKey: string
) {
  return buildFavoriteConfigKey(product) === normalizeFavoriteConfigKey(configKey);
}

export function getBestFavoriteMatch(matches: FavoriteProductMatch[]) {
  if (matches.length === 0) {
    return null;
  }

  return [...matches].sort((a, b) => {
    if (a.currentPrice !== b.currentPrice) {
      return a.currentPrice - b.currentPrice;
    }

    if (a.lastSeen !== b.lastSeen) {
      return b.lastSeen.localeCompare(a.lastSeen);
    }

    return a.partNumber.localeCompare(b.partNumber);
  })[0];
}

export function toFavoriteProductMatch(
  product: FavoriteTrackedProductRow
): FavoriteProductMatch | null {
  const productLine = resolveProductLine(product.productLine, product.title);

  if (!productLine) {
    return null;
  }

  return {
    partNumber: product.partNumber,
    title: product.title,
    currentPrice: product.currentPrice,
    productLine,
    chip: product.chip ?? "",
    screenSize: product.screenSize ?? "",
    memory: product.memory ?? "",
    storage: product.storage ?? "",
    color: product.color ?? "",
    releaseYear: product.releaseYear ?? "",
    productUrl: product.productUrl ?? "",
    imageUrl: product.imageUrl ?? "",
    lastSeen: product.lastSeen,
  };
}

export function getFavoriteStateLabel(state: FavoriteState) {
  return state === "available" ? "Disponible" : "Expiré";
}

export function getDefaultFavoriteNotificationSettings(): FavoriteNotificationSettingsValues {
  return {
    enabled: false,
    channelType: "discord",
    webhookUrl: "",
    triggers: [...FAVORITE_EVENT_TYPES],
  };
}

function isFavoriteEventType(value: string): value is FavoriteEventType {
  return FAVORITE_EVENT_TYPES.includes(value as FavoriteEventType);
}

function isAlertChannelType(value: string): value is AlertChannelType {
  return ALERT_CHANNEL_TYPES.includes(value as AlertChannelType);
}

function normalizeEnabled(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return false;
}

function normalizeChannelType(value: unknown): AlertChannelType {
  if (typeof value !== "string" || !isAlertChannelType(value)) {
    throw new Error("Le canal doit être Discord ou Slack.");
  }

  return value;
}

function normalizeTriggers(value: unknown): FavoriteEventType[] {
  if (!Array.isArray(value)) {
    throw new Error("Sélectionnez au moins un déclencheur.");
  }

  const triggers = Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .filter((entry): entry is FavoriteEventType => isFavoriteEventType(entry))
    )
  );

  if (triggers.length === 0) {
    throw new Error("Sélectionnez au moins un déclencheur.");
  }

  return triggers;
}

function normalizeWebhookUrl(value: unknown, enabled: boolean): string {
  if (!enabled) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim();
  }

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

function safeParseTriggers(value: string): FavoriteEventType[] {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [...FAVORITE_EVENT_TYPES];
    }

    const triggers = parsed.filter(
      (entry): entry is FavoriteEventType =>
        typeof entry === "string" && isFavoriteEventType(entry)
    );

    return triggers.length > 0 ? triggers : [...FAVORITE_EVENT_TYPES];
  } catch {
    return [...FAVORITE_EVENT_TYPES];
  }
}

export function parseFavoriteNotificationSettingsInput(
  value: unknown
): FavoriteNotificationSettingsValues {
  if (!value || typeof value !== "object") {
    throw new Error("Corps de requête invalide.");
  }

  const payload = value as Record<string, unknown>;
  const enabled = normalizeEnabled(payload.enabled);

  return {
    enabled,
    channelType: normalizeChannelType(payload.channelType),
    webhookUrl: normalizeWebhookUrl(payload.webhookUrl, enabled),
    triggers: normalizeTriggers(payload.triggers),
  };
}

export function parseFavoriteNotificationSettingsRow(
  value:
    | {
        id: number;
        enabled: boolean;
        channelType: string;
        webhookUrl: string;
        triggersJson: string;
        createdAt: string;
        updatedAt: string;
      }
    | null
    | undefined
): FavoriteNotificationSettingsRow {
  const defaults = getDefaultFavoriteNotificationSettings();

  if (!value) {
    return {
      id: 0,
      ...defaults,
      createdAt: "",
      updatedAt: "",
    };
  }

  return {
    id: value.id,
    enabled: value.enabled,
    channelType: isAlertChannelType(value.channelType)
      ? value.channelType
      : defaults.channelType,
    webhookUrl: value.webhookUrl,
    triggers: safeParseTriggers(value.triggersJson),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function serializeFavoriteNotificationSettings(
  values: FavoriteNotificationSettingsValues,
  now: string,
  createdAt?: string
) {
  return {
    enabled: values.enabled,
    channelType: values.channelType,
    webhookUrl: values.webhookUrl,
    triggersJson: JSON.stringify(values.triggers),
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
}

export function getFavoriteEventLabel(eventType: FavoriteEventType) {
  if (eventType === "reappearance") {
    return "Réapparition";
  }

  if (eventType === "expiration") {
    return "Expiration";
  }

  return "Baisse de prix";
}

function formatPrice(value: number | null) {
  return value === null ? "—" : `${value.toLocaleString("fr-FR")} €`;
}

function getFavoriteDiscordColor(eventType: FavoriteEventType) {
  if (eventType === "reappearance") {
    return 0x0077ed;
  }

  if (eventType === "expiration") {
    return 0xff9500;
  }

  return 0x34c759;
}

function getFavoriteEventSummary(
  favoriteLabel: string,
  candidate: FavoriteEventCandidate
) {
  const eventLabel = getFavoriteEventLabel(candidate.eventType);

  if (candidate.eventType === "expiration") {
    return `${eventLabel}: ${favoriteLabel} n'est plus disponible`;
  }

  if (candidate.eventType === "reappearance") {
    return `${eventLabel}: ${favoriteLabel} à ${formatPrice(candidate.currentPrice)}`;
  }

  return `${eventLabel}: ${favoriteLabel} de ${formatPrice(candidate.previousPrice)} à ${formatPrice(candidate.currentPrice)}`;
}

export function buildFavoriteWebhookRequest(
  settings: Pick<FavoriteNotificationSettingsValues, "channelType">,
  favoriteLabel: string,
  candidate: FavoriteEventCandidate
) {
  const eventLabel = getFavoriteEventLabel(candidate.eventType);
  const summaryText = getFavoriteEventSummary(favoriteLabel, candidate);
  const previousPriceLabel = formatPrice(candidate.previousPrice);
  const currentPriceLabel = formatPrice(candidate.currentPrice);
  const description =
    candidate.eventType === "reappearance"
      ? "Un favori est de nouveau disponible sur Apple Refurb."
      : candidate.eventType === "expiration"
        ? "Un favori n'est plus visible sur Apple Refurb."
        : "Le meilleur prix d'un favori a baissé.";

  if (settings.channelType === "slack") {
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
              text: `${eventLabel} • Favori`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${favoriteLabel}*\n${description}`,
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
                text: `*Produit*\n${candidate.productTitle}`,
              },
              {
                type: "mrkdwn",
                text: `*Référence*\n${candidate.partNumber}`,
              },
            ],
          },
          ...(candidate.productUrl
            ? [
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
              ]
            : []),
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
          title: `${eventLabel} • Favori`,
          url: candidate.productUrl ?? undefined,
          description,
          color: getFavoriteDiscordColor(candidate.eventType),
          fields: [
            {
              name: "Favori",
              value: favoriteLabel,
              inline: false,
            },
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
              name: "Référence",
              value: candidate.partNumber,
              inline: true,
            },
          ],
          thumbnail: candidate.imageUrl
            ? { url: candidate.imageUrl }
            : undefined,
        },
      ],
    }),
  };
}

export function getFavoriteEventCandidate(args: {
  favoriteId: number;
  previous: FavoriteTransitionState;
  matches: FavoriteProductMatch[];
}) {
  const bestMatch = getBestFavoriteMatch(args.matches);
  const nextState: FavoriteState = bestMatch ? "available" : "unavailable";
  const nextBestPrice = bestMatch?.currentPrice ?? null;
  let event: FavoriteEventCandidate | null = null;

  if (args.previous.currentState !== "available" && nextState === "available") {
    event = {
      favoriteId: args.favoriteId,
      eventType: "reappearance",
      partNumber: bestMatch?.partNumber ?? args.previous.sourcePartNumber,
      productTitle: bestMatch?.title ?? args.previous.label,
      currentPrice: nextBestPrice,
      previousPrice: args.previous.bestCurrentPrice,
      productUrl: bestMatch?.productUrl ?? null,
      imageUrl: bestMatch?.imageUrl ?? null,
    };
  } else if (
    args.previous.currentState === "available" &&
    nextState === "unavailable"
  ) {
    event = {
      favoriteId: args.favoriteId,
      eventType: "expiration",
      partNumber: args.previous.sourcePartNumber,
      productTitle: args.previous.label,
      currentPrice: null,
      previousPrice: args.previous.bestCurrentPrice,
      productUrl: null,
      imageUrl: null,
    };
  } else if (
    args.previous.currentState === "available" &&
    nextState === "available" &&
    args.previous.bestCurrentPrice !== null &&
    nextBestPrice !== null &&
    nextBestPrice < args.previous.bestCurrentPrice - PRICE_EPSILON
  ) {
    event = {
      favoriteId: args.favoriteId,
      eventType: "price_drop",
      partNumber: bestMatch?.partNumber ?? args.previous.sourcePartNumber,
      productTitle: bestMatch?.title ?? args.previous.label,
      currentPrice: nextBestPrice,
      previousPrice: args.previous.bestCurrentPrice,
      productUrl: bestMatch?.productUrl ?? null,
      imageUrl: bestMatch?.imageUrl ?? null,
    };
  }

  return {
    nextState,
    nextBestPrice,
    lastMatchedAt: bestMatch?.lastSeen ?? null,
    bestMatch,
    event,
  };
}

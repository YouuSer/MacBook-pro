import type { Scraper, ScrapeResult, ScrapedProduct } from "./types";
import { createHmac, createHash } from "crypto";

const PA_API_HOST = "webservices.amazon.fr";
const PA_API_REGION = "eu-west-1";
const PA_API_SERVICE = "ProductAdvertisingAPI";

// Search queries to cover M2-M5 Pro MacBook Pros
const SEARCH_KEYWORDS = [
  "MacBook Pro M2 Pro",
  "MacBook Pro M3 Pro",
  "MacBook Pro M4 Pro",
  "MacBook Pro M5 Pro",
];

const PRO_CHIP_REGEX = /M[2-9]\s*Pro/i;

interface PaApiItem {
  ASIN: string;
  DetailPageURL: string;
  ItemInfo?: {
    Title?: { DisplayValue?: string };
    Features?: { DisplayValues?: string[] };
  };
  Offers?: {
    Listings?: Array<{
      Price?: {
        Amount?: number;
        Currency?: string;
        DisplayAmount?: string;
      };
      SavingBasis?: {
        Amount?: number;
        Currency?: string;
      };
      Condition?: { Value?: string };
      MerchantInfo?: { Name?: string };
    }>;
  };
  Images?: {
    Primary?: {
      Large?: { URL?: string };
      Medium?: { URL?: string };
    };
  };
}

function parseChip(title: string): string | null {
  const match = title.match(PRO_CHIP_REGEX);
  return match ? match[0].replace(/\s+/g, " ") : null;
}

function parseMemory(title: string, features?: string[]): string {
  // Try title first: "24 Go" or "36Go" patterns
  const titleMatch = title.match(/(\d+)\s*Go\s*(de\s+)?m[ée]moire/i)
    ?? title.match(/(\d+)\s*Go\s+unifi/i)
    ?? title.match(/(\d+)\s*Go\s*RAM/i);
  if (titleMatch) return `${titleMatch[1]}GB`;

  // Try features
  if (features) {
    for (const f of features) {
      const match = f.match(/(\d+)\s*Go\s*(de\s+)?m[ée]moire/i)
        ?? f.match(/(\d+)\s*Go\s+unifi/i)
        ?? f.match(/(\d+)\s*Go\s*RAM/i);
      if (match) return `${match[1]}GB`;
    }
  }

  // Fallback: any "XX Go" near memory-related words
  const fallback = title.match(/(\d+)\s*Go/i);
  return fallback ? `${fallback[1]}GB` : "";
}

function parseStorage(title: string, features?: string[]): string {
  const patterns = [
    /(\d+)\s*To\s*SSD/i,
    /(\d+)\s*Go\s*SSD/i,
    /SSD\s*(\d+)\s*(To|Go)/i,
    /(\d+)\s*(To|Go)\s*(?:de\s+)?stockage/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const unit = (match[2] ?? "Go").toLowerCase();
      return unit === "to" ? `${match[1]}TB` : `${match[1]}GB`;
    }
  }

  if (features) {
    for (const f of features) {
      for (const pattern of patterns) {
        const match = f.match(pattern);
        if (match) {
          const unit = (match[2] ?? "Go").toLowerCase();
          return unit === "to" ? `${match[1]}TB` : `${match[1]}GB`;
        }
      }
    }
  }

  return "";
}

function parseScreenSize(title: string): string {
  // "14 pouces" or "16 pouces" or "14,2" or "16.2"
  const match = title.match(/(\d{2})[,.]?\d?\s*(?:pouces|"|inch)/i)
    ?? title.match(/(14|16)[,.]?\d?\s/);
  return match ? match[1] : "";
}

function parseReleaseYear(title: string): string {
  const match = title.match(/\b(202[0-9])\b/);
  return match ? match[1] : "";
}

// AWS Signature V4 signing for PA-API
function sign(key: Buffer | string, msg: string): Buffer {
  return createHmac("sha256", key).update(msg).digest();
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = sign(`AWS4${key}`, dateStamp);
  const kRegion = sign(kDate, region);
  const kService = sign(kRegion, service);
  return sign(kService, "aws4_request");
}

async function callPaApi(
  accessKey: string,
  secretKey: string,
  associateTag: string,
  keywords: string
): Promise<PaApiItem[]> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payload = JSON.stringify({
    Keywords: keywords,
    SearchIndex: "Electronics",
    ItemCount: 10,
    PartnerTag: associateTag,
    PartnerType: "Associates",
    Marketplace: "www.amazon.fr",
    LanguagesOfPreference: ["fr_FR"],
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.Features",
      "Offers.Listings.Price",
      "Offers.Listings.SavingBasis",
      "Offers.Listings.Condition",
      "Offers.Listings.MerchantInfo",
      "Images.Primary.Large",
      "Images.Primary.Medium",
    ],
  });

  const endpoint = `https://${PA_API_HOST}/paapi5/searchitems`;
  const canonicalUri = "/paapi5/searchitems";
  const method = "POST";
  const contentType = "application/json; charset=UTF-8";
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";

  const headers: Record<string, string> = {
    "content-encoding": "amz-1.0",
    "content-type": contentType,
    host: PA_API_HOST,
    "x-amz-date": amzDate,
    "x-amz-target": target,
  };

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}`)
    .join("\n") + "\n";

  const payloadHash = createHash("sha256").update(payload).digest("hex");

  const canonicalRequest = [
    method,
    canonicalUri,
    "", // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${PA_API_REGION}/${PA_API_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const signingKey = getSignatureKey(secretKey, dateStamp, PA_API_REGION, PA_API_SERVICE);
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      Authorization: authHeader,
    },
    body: payload,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PA-API returned ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.SearchResult?.Items ?? [];
}

export class AmazonScraper implements Scraper {
  source = "amazon" as const;

  async scrape(): Promise<ScrapeResult> {
    const accessKey = process.env.AMAZON_PA_API_ACCESS_KEY;
    const secretKey = process.env.AMAZON_PA_API_SECRET_KEY;
    const associateTag = process.env.AMAZON_ASSOCIATE_TAG;

    if (!accessKey || !secretKey || !associateTag) {
      throw new Error(
        "Amazon PA-API credentials missing. Set AMAZON_PA_API_ACCESS_KEY, AMAZON_PA_API_SECRET_KEY, AMAZON_ASSOCIATE_TAG."
      );
    }

    const allItems: PaApiItem[] = [];
    const seenAsins = new Set<string>();

    for (const keywords of SEARCH_KEYWORDS) {
      try {
        const items = await callPaApi(accessKey, secretKey, associateTag, keywords);
        for (const item of items) {
          if (!seenAsins.has(item.ASIN)) {
            seenAsins.add(item.ASIN);
            allItems.push(item);
          }
        }
      } catch (err) {
        console.error(`Amazon PA-API error for "${keywords}":`, err);
      }

      // Respect rate limits: 1 request/second
      await new Promise((r) => setTimeout(r, 1100));
    }

    const totalFound = allItems.length;

    // Filter for MacBook Pro with Pro chips
    const products: ScrapedProduct[] = allItems
      .filter((item) => {
        const title = item.ItemInfo?.Title?.DisplayValue ?? "";
        return PRO_CHIP_REGEX.test(title) && /macbook\s*pro/i.test(title);
      })
      .map((item) => {
        const title = item.ItemInfo?.Title?.DisplayValue ?? "";
        const features = item.ItemInfo?.Features?.DisplayValues;
        const listing = item.Offers?.Listings?.[0];
        const currentPrice = listing?.Price?.Amount ?? 0;
        const originalPrice = listing?.SavingBasis?.Amount ?? currentPrice;
        const savingsPercent =
          originalPrice > 0 && currentPrice > 0
            ? ((originalPrice - currentPrice) / originalPrice) * 100
            : 0;
        const savingsAmount = originalPrice - currentPrice;

        return {
          source: "amazon" as const,
          productId: item.ASIN,
          title,
          currentPrice,
          originalPrice,
          savingsPercent,
          savings: savingsAmount > 0 ? `${savingsAmount.toFixed(2)} €` : "",
          chip: parseChip(title) ?? "Unknown",
          screenSize: parseScreenSize(title),
          memory: parseMemory(title, features),
          storage: parseStorage(title, features),
          color: "",
          releaseYear: parseReleaseYear(title),
          productUrl: item.DetailPageURL,
          imageUrl:
            item.Images?.Primary?.Large?.URL ??
            item.Images?.Primary?.Medium?.URL ??
            "",
          condition: (listing?.Condition?.Value?.toLowerCase() as ScrapedProduct["condition"]) ?? "new",
        };
      });

    return { source: "amazon", products, totalFound };
  }
}

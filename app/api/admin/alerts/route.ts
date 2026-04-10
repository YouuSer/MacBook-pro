import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { hasAdminSession, getAdminConfigurationError } from "@/lib/admin-auth";
import {
  parseAlertRuleInput,
  parseAlertRuleRow,
  serializeAlertRuleValues,
} from "@/lib/alerts";
import { getDb } from "@/lib/db";
import { getProductFilterOptions } from "@/lib/product-filters";
import { alertDeliveries, alertRules, products } from "@/lib/schema";
import { toApiError } from "@/lib/api-error";

async function requireAdminAccess() {
  const configurationError = getAdminConfigurationError();

  if (configurationError) {
    return NextResponse.json(
      { error: configurationError, code: "ALERTS_ADMIN_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const authorized = await hasAdminSession();

  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  return null;
}

export async function GET() {
  const denied = await requireAdminAccess();

  if (denied) {
    return denied;
  }

  try {
    const db = getDb();
    const [ruleRows, productRows, deliveryRows] = await Promise.all([
      db.select().from(alertRules).orderBy(desc(alertRules.updatedAt)),
      db
        .select({
          productLine: products.productLine,
          chip: products.chip,
          memory: products.memory,
          storage: products.storage,
          screenSize: products.screenSize,
        })
        .from(products),
      db
        .select()
        .from(alertDeliveries)
        .orderBy(desc(alertDeliveries.createdAt))
        .limit(20),
    ]);

    const rules = ruleRows.map((row) => parseAlertRuleRow(row));
    const ruleNameById = new Map(rules.map((rule) => [rule.id, rule.name]));
    const options = getProductFilterOptions(
      productRows
        .filter(
          (
            row
          ): row is {
            productLine: "air" | "pro";
            chip: string | null;
            memory: string | null;
            storage: string | null;
            screenSize: string | null;
          } => row.productLine === "air" || row.productLine === "pro"
        )
        .map((row) => ({
          productLine: row.productLine,
          chip: row.chip ?? "",
          memory: row.memory ?? "",
          storage: row.storage ?? "",
          screenSize: row.screenSize ?? "",
        }))
    );

    return NextResponse.json({
      rules,
      options,
      deliveries: deliveryRows.map((row) => ({
        ...row,
        ruleName: ruleNameById.get(row.ruleId) ?? `Règle #${row.ruleId}`,
      })),
    });
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_ALERTS_LOAD_FAILED");
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminAccess();

  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const values = parseAlertRuleInput(payload);
    const now = new Date().toISOString();
    const db = getDb();

    const inserted = await db
      .insert(alertRules)
      .values(serializeAlertRuleValues(values, now))
      .returning();

    return NextResponse.json({
      success: true,
      rule: parseAlertRuleRow(inserted[0]),
    });
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_ALERTS_CREATE_FAILED");
    return NextResponse.json(apiError, { status: 400 });
  }
}

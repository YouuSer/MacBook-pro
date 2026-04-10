import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hasAdminSession, getAdminConfigurationError } from "@/lib/admin-auth";
import { parseAlertRuleInput, parseAlertRuleRow } from "@/lib/alerts";
import { getDb } from "@/lib/db";
import { alertRules } from "@/lib/schema";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminAccess();

  if (denied) {
    return denied;
  }

  try {
    const { id } = await params;
    const ruleId = Number(id);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de règle invalide.", code: "INVALID_RULE_ID" },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const values = parseAlertRuleInput(payload);
    const now = new Date().toISOString();
    const db = getDb();
    const existing = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.id, ruleId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { error: "Règle introuvable.", code: "RULE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await db
      .update(alertRules)
      .set({
        name: values.name,
        enabled: values.enabled,
        channelType: values.channelType,
        webhookUrl: values.webhookUrl,
        triggersJson: JSON.stringify(values.triggers),
        filtersJson: JSON.stringify(values.filters),
        updatedAt: now,
      })
      .where(eq(alertRules.id, ruleId))
      .returning();

    return NextResponse.json({
      success: true,
      rule: parseAlertRuleRow(updated[0]),
    });
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_ALERTS_UPDATE_FAILED");
    return NextResponse.json(apiError, { status: 400 });
  }
}

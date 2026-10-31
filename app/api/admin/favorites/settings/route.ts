import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireAdminAccess } from "@/lib/admin-route";
import { getDb } from "@/lib/db";
import {
  parseFavoriteNotificationSettingsInput,
  parseFavoriteNotificationSettingsRow,
  serializeFavoriteNotificationSettings,
} from "@/lib/favorites";
import { favoriteNotificationSettings } from "@/lib/schema";
import { toApiError } from "@/lib/api-error";

export async function GET() {
  const denied = await requireAdminAccess();

  if (denied) {
    return denied;
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(favoriteNotificationSettings)
      .orderBy(desc(favoriteNotificationSettings.updatedAt))
      .limit(1);

    return NextResponse.json({
      settings: parseFavoriteNotificationSettingsRow(rows[0]),
    });
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_FAVORITE_SETTINGS_LOAD_FAILED");
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdminAccess();

  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const values = parseFavoriteNotificationSettingsInput(payload);
    const now = new Date().toISOString();
    const db = getDb();
    const existing = await db
      .select()
      .from(favoriteNotificationSettings)
      .orderBy(desc(favoriteNotificationSettings.updatedAt))
      .limit(1);

    if (!existing[0]) {
      const inserted = await db
        .insert(favoriteNotificationSettings)
        .values(serializeFavoriteNotificationSettings(values, now))
        .returning();

      return NextResponse.json({
        success: true,
        settings: parseFavoriteNotificationSettingsRow(inserted[0]),
      });
    }

    const updated = await db
      .update(favoriteNotificationSettings)
      .set(
        serializeFavoriteNotificationSettings(
          values,
          now,
          existing[0].createdAt
        )
      )
      .where(eq(favoriteNotificationSettings.id, existing[0].id))
      .returning();

    return NextResponse.json({
      success: true,
      settings: parseFavoriteNotificationSettingsRow(updated[0]),
    });
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_FAVORITE_SETTINGS_UPDATE_FAILED");
    return NextResponse.json(apiError, { status: 400 });
  }
}

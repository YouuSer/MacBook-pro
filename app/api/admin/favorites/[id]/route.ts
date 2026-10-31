import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdminAccess } from "@/lib/admin-route";
import { getDb } from "@/lib/db";
import { favoriteConfigs, favoriteEvents } from "@/lib/schema";
import { toApiError } from "@/lib/api-error";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminAccess();

  if (denied) {
    return denied;
  }

  try {
    const { id } = await params;
    const favoriteId = Number(id);

    if (!Number.isInteger(favoriteId) || favoriteId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de favori invalide.", code: "INVALID_FAVORITE_ID" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [existingFavorite] = await db
      .select()
      .from(favoriteConfigs)
      .where(eq(favoriteConfigs.id, favoriteId))
      .limit(1);

    if (!existingFavorite) {
      return NextResponse.json(
        { error: "Favori introuvable.", code: "FAVORITE_NOT_FOUND" },
        { status: 404 }
      );
    }

    await db.delete(favoriteEvents).where(eq(favoriteEvents.favoriteId, favoriteId));
    await db.delete(favoriteConfigs).where(eq(favoriteConfigs.id, favoriteId));

    return NextResponse.json({ success: true });
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_FAVORITES_DELETE_FAILED");
    return NextResponse.json(apiError, { status: 500 });
  }
}

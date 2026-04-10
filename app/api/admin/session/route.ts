import { NextResponse } from "next/server";
import {
  attachAdminSession,
  clearAdminSession,
  getAdminConfigurationError,
  isValidAdminToken,
} from "@/lib/admin-auth";
import { toApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  const configurationError = getAdminConfigurationError();

  if (configurationError) {
    return NextResponse.json(
      { error: configurationError, code: "ALERTS_ADMIN_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  try {
    const payload = (await request.json()) as { token?: string };
    const token = payload.token?.trim() ?? "";

    if (!isValidAdminToken(token)) {
      return NextResponse.json(
        { error: "Token admin invalide.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    return attachAdminSession(response);
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_SESSION_CREATE_FAILED");
    return NextResponse.json(apiError, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  return clearAdminSession(response);
}

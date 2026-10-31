import { NextResponse } from "next/server";
import { getAdminConfigurationError, hasAdminSession } from "./admin-auth";

export async function requireAdminAccess() {
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

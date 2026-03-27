export function toApiError(error: unknown, fallbackCode: string) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("turso_database_url") ||
    normalized.includes("turso_auth_token") ||
    normalized.includes("database configuration error")
  ) {
    return { error: message, code: "DB_CONFIG_ERROR" };
  }

  if (normalized.includes("no such table")) {
    return { error: message, code: "DB_SCHEMA_MISSING" };
  }

  if (
    normalized.includes("not authorized") ||
    normalized.includes("unauthorized") ||
    normalized.includes("auth token")
  ) {
    return { error: message, code: "DB_AUTH_ERROR" };
  }

  return { error: message, code: fallbackCode };
}

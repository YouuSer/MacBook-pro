import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const LOCAL_DB_URL = "file:./local.db";

let dbInstance: ReturnType<typeof drizzle> | null = null;

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function resolveDbConfig() {
  const url = normalizeEnvValue(process.env.TURSO_DATABASE_URL);
  const authToken = normalizeEnvValue(process.env.TURSO_AUTH_TOKEN);
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    return {
      url: url ?? LOCAL_DB_URL,
      authToken,
    };
  }

  if (!url) {
    throw new Error(
      "Database configuration error: TURSO_DATABASE_URL is required in production."
    );
  }

  if (url.startsWith("file:")) {
    throw new Error(
      "Database configuration error: TURSO_DATABASE_URL must target Turso in production (expected libsql://...)."
    );
  }

  if (!authToken) {
    throw new Error(
      "Database configuration error: TURSO_AUTH_TOKEN is required in production."
    );
  }

  return { url, authToken };
}

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const client = createClient(resolveDbConfig());
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

import { existsSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

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

function resolveLocalDbPath() {
  const configuredPath = normalizeEnvValue(process.env.LOCAL_DB_PATH);
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  let currentDir = path.resolve(process.cwd());

  while (true) {
    const localDbPath = path.join(currentDir, "local.db");
    const packageJsonPath = path.join(currentDir, "package.json");

    if (existsSync(localDbPath) || existsSync(packageJsonPath)) {
      return localDbPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return path.resolve(process.cwd(), "local.db");
    }

    currentDir = parentDir;
  }
}

function formatDbTarget(url: string) {
  if (url.startsWith("file:")) {
    return url.slice("file:".length);
  }

  try {
    const parsed = new URL(url.replace(/^libsql:\/\//, "https://"));
    return parsed.host + parsed.pathname;
  } catch {
    return "configured remote database";
  }
}

const LOCAL_DB_URL = `file:${resolveLocalDbPath()}`;

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

export function inspectDbConfig() {
  try {
    const { url } = resolveDbConfig();

    if (url.startsWith("file:")) {
      return {
        kind: "sqlite-local" as const,
        target: formatDbTarget(url),
      };
    }

    return {
      kind: "turso" as const,
      target: formatDbTarget(url),
    };
  } catch (error) {
    return {
      kind: "invalid" as const,
      target: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const client = createClient(resolveDbConfig());
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

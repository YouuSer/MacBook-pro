import { createClient } from "@libsql/client";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultLocalDbPath = path.join(repoRoot, "local.db");

function printUsage() {
  console.log(`
Usage:
  node scripts/consolidate-price-history.mjs [--local|--prod] [--gap-seconds=300] [--sample-limit=10] [--apply]
  node scripts/consolidate-price-history.mjs --local-db-path=/absolute/path/to/db.sqlite [--gap-seconds=300] [--apply]

Options:
  --local                 Use the local SQLite database (default).
  --prod                  Use the Turso production database from .env.prod.
  --local-db-path=PATH    Override the local SQLite database path.
  --gap-seconds=N         Merge same-price periods when the gap is <= N seconds. Default: 300.
  --sample-limit=N        Number of merged groups to preview in dry-run output. Default: 10.
  --apply                 Rewrite price_history with consolidated rows.
  --help                  Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    target: "local",
    localDbPath: null,
    gapSeconds: 300,
    sampleLimit: 10,
    apply: false,
  };

  for (const arg of argv) {
    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--local") {
      options.target = "local";
      continue;
    }

    if (arg === "--prod") {
      options.target = "prod";
      continue;
    }

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg.startsWith("--local-db-path=")) {
      options.target = "local";
      options.localDbPath = arg.slice("--local-db-path=".length);
      continue;
    }

    if (arg.startsWith("--gap-seconds=")) {
      const value = Number.parseInt(arg.slice("--gap-seconds=".length), 10);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Invalid --gap-seconds value: ${arg}`);
      }
      options.gapSeconds = value;
      continue;
    }

    if (arg.startsWith("--sample-limit=")) {
      const value = Number.parseInt(arg.slice("--sample-limit=".length), 10);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid --sample-limit value: ${arg}`);
      }
      options.sampleLimit = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function loadEnvFile(envFileName) {
  const envPath = path.join(repoRoot, envFileName);

  if (!existsSync(envPath)) {
    return;
  }

  const envContent = readFileSync(envPath, "utf-8");

  for (const line of envContent.split("\n")) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function resolveLocalUrl(localDbPath) {
  const absolutePath = path.resolve(localDbPath ?? defaultLocalDbPath);
  return `file:${absolutePath}`;
}

function resolveDbConfig(options) {
  if (options.target === "prod") {
    loadEnvFile(".env.prod");

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.prod");
    }

    return {
      label: url,
      url,
      authToken,
    };
  }

  loadEnvFile(".env.local");

  return {
    label: resolveLocalUrl(options.localDbPath).slice("file:".length),
    url: resolveLocalUrl(options.localDbPath),
  };
}

function buildCollapseCtes(gapSeconds) {
  return `
    WITH ordered AS (
      SELECT
        id,
        part_number,
        price,
        first_seen_at,
        last_seen_at,
        LAG(price) OVER (
          PARTITION BY part_number
          ORDER BY first_seen_at, id
        ) AS prev_price,
        LAG(last_seen_at) OVER (
          PARTITION BY part_number
          ORDER BY first_seen_at, id
        ) AS prev_last_seen_at,
        unixepoch(first_seen_at) - unixepoch(
          LAG(last_seen_at) OVER (
            PARTITION BY part_number
            ORDER BY first_seen_at, id
          )
        ) AS gap_seconds
      FROM price_history
    ),
    marked AS (
      SELECT
        *,
        CASE
          WHEN prev_price = price
            AND prev_last_seen_at IS NOT NULL
            AND gap_seconds <= ${gapSeconds}
          THEN 0
          ELSE 1
        END AS starts_new_group
      FROM ordered
    ),
    grouped AS (
      SELECT
        *,
        SUM(starts_new_group) OVER (
          PARTITION BY part_number
          ORDER BY first_seen_at, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS grp
      FROM marked
    ),
    collapsed AS (
      SELECT
        part_number,
        price,
        grp,
        MIN(first_seen_at) AS first_seen_at,
        MAX(last_seen_at) AS last_seen_at,
        COUNT(*) AS source_rows,
        MIN(COALESCE(gap_seconds, 0)) AS min_gap_seconds,
        MAX(COALESCE(gap_seconds, 0)) AS max_gap_seconds
      FROM grouped
      GROUP BY part_number, price, grp
    )
  `;
}

function buildSummarySql(gapSeconds) {
  return `
    ${buildCollapseCtes(gapSeconds)}
    SELECT
      (SELECT COUNT(*) FROM price_history) AS original_rows,
      (SELECT COUNT(*) FROM collapsed) AS consolidated_rows,
      (SELECT COALESCE(SUM(source_rows - 1), 0) FROM collapsed WHERE source_rows > 1) AS rows_removed,
      (SELECT COUNT(*) FROM collapsed WHERE source_rows > 1) AS merged_groups
  `;
}

function buildSampleSql(gapSeconds, sampleLimit) {
  return `
    ${buildCollapseCtes(gapSeconds)}
    SELECT
      part_number,
      price,
      first_seen_at,
      last_seen_at,
      source_rows,
      min_gap_seconds,
      max_gap_seconds
    FROM collapsed
    WHERE source_rows > 1
    ORDER BY source_rows DESC, first_seen_at DESC
    LIMIT ${sampleLimit}
  `;
}

function buildApplyStatements(gapSeconds) {
  return [
    "DROP TABLE IF EXISTS price_history_new",
    `
      CREATE TABLE price_history_new (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        part_number text NOT NULL,
        price real NOT NULL,
        first_seen_at text NOT NULL,
        last_seen_at text NOT NULL,
        FOREIGN KEY (part_number) REFERENCES products(part_number) ON UPDATE no action ON DELETE no action
      )
    `,
    `
      ${buildCollapseCtes(gapSeconds)}
      INSERT INTO price_history_new (part_number, price, first_seen_at, last_seen_at)
      SELECT part_number, price, first_seen_at, last_seen_at
      FROM collapsed
      ORDER BY part_number, first_seen_at
    `,
    "DROP TABLE price_history",
    "ALTER TABLE price_history_new RENAME TO price_history",
  ];
}

function printRows(label, rows) {
  console.log(`\n## ${label}`);
  console.log(JSON.stringify(rows, null, 2));
}

const options = parseArgs(process.argv.slice(2));
const dbConfig = resolveDbConfig(options);
const client = createClient({
  url: dbConfig.url,
  authToken: dbConfig.authToken,
});

try {
  console.log(
    `${options.apply ? "Applying" : "Previewing"} consolidation on ${dbConfig.label}`
  );
  console.log(`Gap threshold: ${options.gapSeconds}s`);

  const beforeSummary = await client.execute(buildSummarySql(options.gapSeconds));
  printRows("before", beforeSummary.rows);

  const sample = await client.execute(buildSampleSql(options.gapSeconds, options.sampleLimit));
  printRows("sample merged groups", sample.rows);

  if (!options.apply) {
    console.log("\nDry run only. Re-run with --apply to rewrite price_history.");
    process.exit(0);
  }

  await client.batch(buildApplyStatements(options.gapSeconds), "write");

  const afterSummary = await client.execute(buildSummarySql(options.gapSeconds));
  printRows("after", afterSummary.rows);
  console.log("\nConsolidation complete.");
} finally {
  client.close();
}

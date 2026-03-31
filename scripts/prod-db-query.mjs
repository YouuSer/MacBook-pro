import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

function loadProdEnv() {
  const envPath = new URL("../.env.prod", import.meta.url);
  const envContent = readFileSync(envPath, "utf-8");

  for (const line of envContent.split("\n")) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function getQueries() {
  const customSql = process.argv.slice(2).join(" ").trim();

  if (customSql) {
    return [{ label: "query", sql: customSql }];
  }

  return [
    { label: "products", sql: "select count(*) as count from products" },
    { label: "price_history", sql: "select count(*) as count from price_history" },
    { label: "scrape_runs", sql: "select count(*) as count from scrape_runs" },
    {
      label: "latest_runs",
      sql: [
        "select scraped_at, status, total_found, tracked_product_count, new_products, error_message",
        "from scrape_runs",
        "order by scraped_at desc",
        "limit 5",
      ].join(" "),
    },
  ];
}

loadProdEnv();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.prod");
  process.exit(1);
}

const client = createClient({ url, authToken });

try {
  for (const query of getQueries()) {
    const result = await client.execute(query.sql);
    console.log(`## ${query.label}`);
    console.log(JSON.stringify(result.rows, null, 2));
  }
} finally {
  client.close();
}

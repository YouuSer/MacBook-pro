import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

// Load .env.prod
const envPath = new URL("../.env.prod", import.meta.url);
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^(\w+)=(.+)$/);
  if (match) process.env[match[1]] = match[2].trim();
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.prod");
  process.exit(1);
}

const client = createClient({ url, authToken });

const sql = readFileSync(new URL("./migrate-price-history.sql", import.meta.url), "utf-8");
// Remove comment lines before splitting on ;
const cleaned = sql.replace(/^--.*$/gm, "");
const statements = cleaned
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Running ${statements.length} statements on ${url}...`);

for (const stmt of statements) {
  console.log(`> ${stmt.slice(0, 60)}...`);
  await client.execute(stmt);
}

console.log("Migration done.");
client.close();

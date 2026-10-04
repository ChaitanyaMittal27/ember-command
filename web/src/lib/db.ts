// Server-side only: the connection to Tiger Data (TimescaleDB). Import this from route handlers,
// never from client components, so the connection string stays on the server.

import { Pool } from "pg";

/** True when a connection string is set. Does not touch the database. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.TIGER_DATABASE_URL?.trim());
}

/**
 * node-postgres reads `sslmode=require` as "verify the certificate", and fails on Tiger's chain
 * (SELF_SIGNED_CERT_IN_CHAIN). In libpq, which psycopg and psql use, `require` means "encrypt, but do
 * not verify"; `uselibpqcompat` asks node-postgres for that same meaning. A string that says
 * `sslmode=verify-full` is still verified.
 */
export function libpqCompatible(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("uselibpqcompat")) url.searchParams.set("uselibpqcompat", "true");
    return url.toString();
  } catch {
    return connectionString;
  }
}

// One pool per server process, kept across hot reloads in development.
const holder = globalThis as typeof globalThis & { __historyPool?: Pool };

function pool(): Pool {
  if (!holder.__historyPool) {
    holder.__historyPool = new Pool({
      connectionString: libpqCompatible(process.env.TIGER_DATABASE_URL?.trim() ?? ""),
      max: 3,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 15_000,
    });
  }
  return holder.__historyPool;
}

/** Runs a parameterised query and returns its rows. */
export async function queryRows<Row>(sql: string, params: readonly string[]): Promise<Row[]> {
  const result = await pool().query(sql, [...params]);
  return result.rows as Row[];
}

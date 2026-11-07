import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const g = globalThis as unknown as { __pool?: mysql.Pool; __schema?: Promise<void> };

function pool(): mysql.Pool {
  if (!g.__pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__pool = mysql.createPool({ uri: url, connectionLimit: 5, waitForConnections: true });
  }
  return g.__pool;
}

// Creates tables and seed rows from db/schema.sql on first use (all statements are idempotent).
async function ensureSchema(p: mysql.Pool): Promise<void> {
  const sql = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  const statements = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const st of statements) await p.query(st);
}

export function db(): mysql.Pool {
  const p = pool();
  if (!g.__schema) {
    g.__schema = ensureSchema(p).catch((e) => {
      g.__schema = undefined;
      console.error("schema setup failed:", e);
      throw e;
    });
  }
  // Callers get the pool; queries wait until the schema promise has resolved.
  return new Proxy(p, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (prop === "query" || prop === "execute") {
        return async (...args: unknown[]) => {
          await g.__schema;
          return (v as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}

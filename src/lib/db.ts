import mysql from "mysql2/promise";

const g = globalThis as unknown as { __pool?: mysql.Pool };

export function db(): mysql.Pool {
  if (!g.__pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__pool = mysql.createPool({ uri: url, connectionLimit: 5, waitForConnections: true });
  }
  return g.__pool;
}

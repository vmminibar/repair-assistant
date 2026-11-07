import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brand = (searchParams.get("brand") ?? "").slice(0, 120);
  const q = (searchParams.get("q") ?? "").slice(0, 60).replace(/[%_]/g, "");
  if (!brand) return NextResponse.json({ models: [] });
  try {
    const [rows] = await db().query(
      `SELECT m.model_number AS model, m.verified AS verified
         FROM models m JOIN brands b ON b.id = m.brand_id
        WHERE b.name = ? AND m.model_number LIKE ?
        ORDER BY m.verified DESC, m.model_number LIMIT 15`,
      [brand, `${q}%`],
    );
    return NextResponse.json({ models: rows });
  } catch (e) {
    console.error("models failed:", e);
    return NextResponse.json({ models: [] });
  }
}

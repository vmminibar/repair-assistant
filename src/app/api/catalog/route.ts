import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cats] = await db().query("SELECT id, name FROM categories WHERE active = 1 ORDER BY name");
    const [brands] = await db().query("SELECT id, name FROM brands WHERE active = 1 ORDER BY name");
    return NextResponse.json({ categories: cats, brands });
  } catch (e) {
    console.error("catalog failed:", e);
    return NextResponse.json({ error: "Catalog unavailable. Check DATABASE_URL and run db/schema.sql." }, { status: 500 });
  }
}

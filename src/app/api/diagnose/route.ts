import { NextResponse } from "next/server";
import { parseInput, runDiagnosis } from "@/lib/diagnose";
import { clientIp, rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (rateLimited(`diagnose:${clientIp(req)}`)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const input = parseInput(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    return NextResponse.json(await runDiagnosis(input));
  } catch (e) {
    console.error("diagnose failed:", e);
    return NextResponse.json(
      { error: "The assistant could not complete the diagnosis. Please try again." },
      { status: 502 },
    );
  }
}

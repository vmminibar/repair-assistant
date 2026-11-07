import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Reports which required settings are present (never their values).
export async function GET() {
  const search = (process.env.SEARCH_PROVIDER ?? "brave").toLowerCase();
  return NextResponse.json({
    database: Boolean(process.env.DATABASE_URL),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    search: search === "tavily" ? Boolean(process.env.TAVILY_API_KEY) : Boolean(process.env.BRAVE_API_KEY),
  });
}

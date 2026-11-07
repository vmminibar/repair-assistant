export type SearchResult = { title: string; url: string; snippet: string };

function cleanUrl(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function brave(query: string, count: number): Promise<SearchResult[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) throw new Error("BRAVE_API_KEY is not set");
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
    { headers: { Accept: "application/json", "X-Subscription-Token": key }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Brave search failed: ${res.status}`);
  const data = (await res.json()) as { web?: { results?: { title?: string; url?: string; description?: string }[] } };
  const out: SearchResult[] = [];
  for (const r of data.web?.results ?? []) {
    const url = r.url ? cleanUrl(r.url) : null;
    if (url) out.push({ title: r.title ?? url, url, snippet: (r.description ?? "").replace(/<[^>]+>/g, "") });
  }
  return out;
}

async function tavily(query: string, count: number): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY is not set");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, max_results: count }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  const out: SearchResult[] = [];
  for (const r of data.results ?? []) {
    const url = r.url ? cleanUrl(r.url) : null;
    if (url) out.push({ title: r.title ?? url, url, snippet: r.content ?? "" });
  }
  return out;
}

export async function webSearch(query: string, count = 8): Promise<SearchResult[]> {
  const provider = (process.env.SEARCH_PROVIDER ?? "brave").toLowerCase();
  return provider === "tavily" ? tavily(query, count) : brave(query, count);
}

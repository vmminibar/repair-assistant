import type { SearchResult } from "./search.ts";

export type Tier =
  | "exact_service_manual"
  | "exact_user_manual"
  | "official_support"
  | "third_party_model"
  | "third_party";

export type RankedSource = SearchResult & { id: number; tier: Tier; official: boolean; modelMatch: boolean };

export type EvidenceLevel =
  | "verified_exact"
  | "related_manufacturer"
  | "general"
  | "unverified";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function tierOf(r: SearchResult, brand: string, model: string): Omit<RankedSource, "id"> {
  const brandKey = norm(brand);
  const modelKey = norm(model);
  let host = "";
  try {
    host = new URL(r.url).hostname;
  } catch {
    host = "";
  }
  const official = brandKey.length >= 3 && norm(host).includes(brandKey);
  const blob = norm(`${r.title} ${r.url} ${r.snippet}`);
  const modelMatch = modelKey.length >= 3 && blob.includes(modelKey);
  const text = `${r.title} ${r.url}`.toLowerCase();
  const isService = /service manual|workshop manual|repair manual|technical manual/.test(text);
  const isManual = /manual|user guide|owner'?s guide|instruction|\.pdf/.test(text);

  let tier: Tier = "third_party";
  if (official && modelMatch && isService) tier = "exact_service_manual";
  else if (official && modelMatch && isManual) tier = "exact_user_manual";
  else if (official) tier = "official_support";
  else if (modelMatch) tier = "third_party_model";
  return { ...r, tier, official, modelMatch };
}

const TIER_ORDER: Tier[] = [
  "exact_service_manual",
  "exact_user_manual",
  "official_support",
  "third_party_model",
  "third_party",
];

export function rankSources(results: SearchResult[], brand: string, model: string): RankedSource[] {
  return results
    .map((r) => tierOf(r, brand, model))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
    .map((r, i) => ({ ...r, id: i }));
}

/** The highest evidence level the sources can honestly support. */
export function evidenceCeiling(sources: RankedSource[]): EvidenceLevel {
  if (sources.some((s) => s.tier === "exact_service_manual" || s.tier === "exact_user_manual"))
    return "verified_exact";
  if (sources.some((s) => s.tier === "official_support")) return "related_manufacturer";
  if (sources.length > 0) return "general";
  return "unverified";
}

const LEVEL_ORDER: EvidenceLevel[] = ["unverified", "general", "related_manufacturer", "verified_exact"];

export function clampEvidence(claimed: EvidenceLevel, ceiling: EvidenceLevel): EvidenceLevel {
  return LEVEL_ORDER.indexOf(claimed) <= LEVEL_ORDER.indexOf(ceiling) ? claimed : ceiling;
}

export function isEvidenceLevel(v: unknown): v is EvidenceLevel {
  return typeof v === "string" && (LEVEL_ORDER as string[]).includes(v);
}

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  verified_exact: "Exact-model documentation found (based on search excerpts; confirm against the manual)",
  related_manufacturer: "Based on related manufacturer documentation",
  general: "General troubleshooting guidance, not verified for this model",
  unverified: "Unverified. No documentation found. A technician should confirm",
};

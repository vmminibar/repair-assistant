"use client";

import { useEffect, useRef, useState } from "react";

type Risk = "user_safe" | "intermediate" | "professional";
type Step = {
  title: string;
  instructions: string;
  expected: string;
  ifPass: string;
  ifFail: string;
  risk: Risk;
  warnings: string[];
  blocked: boolean;
};
type Result = {
  sessionId: string;
  mode: "needs_info" | "result";
  urgentWarning: string | null;
  modelStatus: "verified_in_catalog" | "documentation_found" | "unverified";
  summary: string;
  questions: { id: string; text: string }[];
  evidenceLevel: string;
  evidenceLabel: string;
  causes: { title: string; description: string; evidence: string; priority: number; needsTesting: boolean }[];
  steps: Step[];
  tools: string[];
  parts: { name: string; note: string }[];
  difficulty: Risk;
  technicianRecommended: boolean;
  technicianReason: string;
  sources: { id: number; title: string; url: string; tier: string; official: boolean }[];
  noDocumentation: boolean;
};

const PROBLEMS = [
  "Not turning on",
  "Not working properly",
  "Strange noise",
  "Leaking",
  "Error code or blinking light",
  "Overheating",
  "Poor performance",
  "Other",
];

const RISK_LABEL: Record<Risk, string> = {
  user_safe: "Basic user check",
  intermediate: "Intermediate maintenance",
  professional: "Qualified technician required",
};
const RISK_STYLE: Record<Risk, string> = {
  user_safe: "bg-green-100 text-green-900",
  intermediate: "bg-amber-100 text-amber-900",
  professional: "bg-red-100 text-red-900",
};
const MODEL_LABEL = {
  verified_in_catalog: "Model verified in catalog",
  documentation_found: "Documentation found for this model. Confirm it matches your label",
  unverified: "Model not verified (user-entered)",
};
const TIER_LABEL: Record<string, string> = {
  exact_service_manual: "Official service manual",
  exact_user_manual: "Official user manual",
  official_support: "Manufacturer support page",
  third_party_model: "Third-party page mentioning this model",
  third_party: "Third-party page",
};

export default function Troubleshoot() {
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [models, setModels] = useState<{ model: string; verified: number }[]>([]);
  const [catalogError, setCatalogError] = useState("");

  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [capacity, setCapacity] = useState("");
  const [problemCategory, setProblemCategory] = useState("");
  const [description, setDescription] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [imageFacts, setImageFacts] = useState("");

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setCatalogError(d.error);
        else {
          setCats(d.categories);
          setBrands(d.brands);
        }
      })
      .catch(() => setCatalogError("Could not load the product catalog."));
  }, []);

  useEffect(() => {
    if (!brand) return setModels([]);
    const t = setTimeout(() => {
      fetch(`/api/models?brand=${encodeURIComponent(brand)}&q=${encodeURIComponent(model)}`)
        .then((r) => r.json())
        .then((d) => setModels(d.models ?? []))
        .catch(() => setModels([]));
    }, 250);
    return () => clearTimeout(t);
  }, [brand, model]);

  useEffect(() => {
    if (!result) return;
    try {
      const saved = localStorage.getItem(`steps:${result.sessionId}`);
      if (saved) setDone(JSON.parse(saved));
    } catch {}
  }, [result?.sessionId]);

  function toggleStep(i: number) {
    if (!result) return;
    const next = { ...done, [i]: !done[i] };
    setDone(next);
    try {
      localStorage.setItem(`steps:${result.sessionId}`, JSON.stringify(next));
    } catch {}
  }

  async function run(history: { q: string; a: string }[]) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, brand, model, capacity, problemCategory, description, errorCode, imageFacts, answers: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data);
      setAnswers(history);
      setDraft({});
      setDone({});
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    run([]);
  }

  function continueWithAnswers() {
    if (!result) return;
    const extra = result.questions
      .map((q) => ({ q: q.text, a: (draft[q.id] ?? "").trim() }))
      .filter((x) => x.a);
    if (extra.length === 0) return setError("Answer at least one question.");
    run([...answers, ...extra]);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoNote("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Could not read the file."));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not read the photo.");
      if (d.brand && !brand) setBrand(d.brand);
      if (d.model && !model) setModel(d.model);
      if (d.errorCodes?.length && !errorCode) setErrorCode(d.errorCodes[0]);
      const facts = [d.indicators && `Indicators: ${d.indicators}`, d.observations && `Photo: ${d.observations}`]
        .filter(Boolean)
        .join(". ");
      setImageFacts(facts);
      setPhotoNote(
        `Read from photo: brand ${d.brand ?? "not readable"}, model ${d.model ?? "not readable"}, error codes ${d.errorCodes?.join(", ") || "none"}. Please check and correct the fields above before searching.`,
      );
    } catch (e) {
      setPhotoNote(e instanceof Error ? e.message : "Could not read the photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Find a repair solution</h1>
      {catalogError && <p className="card border-red-300 text-red-800">{catalogError}</p>}

      <form onSubmit={onSubmit} className="card no-print space-y-4">
        <label className="block">
          <span className="mb-1 block font-medium">Product category</span>
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Select…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-medium">Brand</span>
          <input className="field" list="brands" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Type or pick a brand" required />
          <datalist id="brands">{brands.map((b) => <option key={b.id} value={b.name} />)}</datalist>
        </label>

        <label className="block">
          <span className="mb-1 block font-medium">Model number</span>
          <input className="field" list="models" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Check the label on the product" />
          <datalist id="models">{models.map((m) => <option key={m.model} value={m.model} />)}</datalist>
          <span className="mt-1 block text-sm text-slate-500">If your model is not listed, type it. It will be marked unverified until documentation is found.</span>
        </label>

        <label className="block">
          <span className="mb-1 block font-medium">Capacity or specifications (optional)</span>
          <input className="field" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 12,000 BTU, 7 kg, 5 kVA" />
        </label>

        <label className="block">
          <span className="mb-1 block font-medium">Problem type</span>
          <select className="field" value={problemCategory} onChange={(e) => setProblemCategory(e.target.value)}>
            <option value="">Select…</option>
            {PROBLEMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-medium">Describe the problem</span>
          <textarea className="field min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happens, and when did it start?" required minLength={5} maxLength={2000} />
        </label>

        <label className="block">
          <span className="mb-1 block font-medium">Error code (optional)</span>
          <input className="field" value={errorCode} onChange={(e) => setErrorCode(e.target.value)} maxLength={80} />
        </label>

        <div>
          <span className="mb-1 block font-medium">Photo of model label, error display or damage (optional)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => onPhoto(e.target.files?.[0])} className="block w-full text-sm" />
          {photoBusy && <p className="mt-1 text-sm">Reading photo…</p>}
          {photoNote && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{photoNote}</p>}
        </div>

        <button className="btn w-full" disabled={loading}>
          {loading && !result ? "Searching documentation…" : "Find Repair Solution"}
        </button>
      </form>

      {error && <p role="alert" className="card border-red-300 text-red-800">{error}</p>}

      <div ref={topRef} />
      {result && (
        <section className="space-y-4">
          {result.urgentWarning && (
            <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-4 font-medium text-red-900">
              ⚠ {result.urgentWarning}
            </div>
          )}

          <div className="card space-y-2">
            <p className="text-sm"><b>{brand}</b> {model || "(model not given)"} · {category}</p>
            <p className="text-sm">Model status: <b>{MODEL_LABEL[result.modelStatus]}</b></p>
            <p className="text-sm">Evidence: <b>{result.evidenceLabel}</b></p>
            {result.summary && <p>{result.summary}</p>}
          </div>

          {result.mode === "needs_info" && (
            <div className="card no-print space-y-3">
              <h2 className="text-lg font-semibold">A few questions first</h2>
              {result.questions.map((q) => (
                <label key={q.id} className="block">
                  <span className="mb-1 block">{q.text}</span>
                  <input className="field" value={draft[q.id] ?? ""} onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })} maxLength={500} />
                </label>
              ))}
              <button className="btn w-full" onClick={continueWithAnswers} disabled={loading}>
                {loading ? "Working…" : "Continue"}
              </button>
            </div>
          )}

          {result.mode === "result" && (
            <>
              {result.noDocumentation && (
                <div className="card border-amber-400 text-amber-900">
                  No reliable documentation was found for this product. The guidance below is general and unverified. Confirm with a technician before acting on it.
                </div>
              )}

              {result.technicianRecommended && (
                <div className="card border-red-400">
                  <b>Qualified technician recommended.</b> {result.technicianReason}
                </div>
              )}

              <div className="card">
                <span className={`rounded px-2 py-1 text-sm font-medium ${RISK_STYLE[result.difficulty]}`}>
                  {RISK_LABEL[result.difficulty]}
                </span>
              </div>

              {result.causes.length > 0 && (
                <div className="card space-y-3">
                  <h2 className="text-lg font-semibold">Possible causes (not confirmed)</h2>
                  {[...result.causes].sort((a, b) => a.priority - b.priority).map((c, i) => (
                    <div key={i}>
                      <p className="font-medium">{i + 1}. {c.title}</p>
                      <p className="text-sm">{c.description}</p>
                      {c.evidence && <p className="text-sm text-slate-500">Basis: {c.evidence}</p>}
                      {c.needsTesting && <p className="text-sm text-slate-500">Needs further testing.</p>}
                    </div>
                  ))}
                </div>
              )}

              {result.steps.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">Step-by-step checks</h2>
                  {result.steps.map((s, i) => (
                    <div key={i} className={`card space-y-2 ${s.blocked ? "border-red-400" : ""}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">Step {i + 1}: {s.title}</p>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${RISK_STYLE[s.risk]}`}>{RISK_LABEL[s.risk]}</span>
                      </div>
                      <p className={s.blocked ? "font-semibold text-red-800" : ""}>{s.instructions}</p>
                      {s.expected && <p className="text-sm"><b>You should see:</b> {s.expected}</p>}
                      {s.ifPass && <p className="text-sm"><b>If this works:</b> {s.ifPass}</p>}
                      {s.ifFail && <p className="text-sm"><b>If it does not:</b> {s.ifFail}</p>}
                      {s.warnings.map((w, k) => <p key={k} className="text-sm text-red-800">⚠ {w}</p>)}
                      {!s.blocked && (
                        <label className="no-print flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!done[i]} onChange={() => toggleStep(i)} /> Mark as done
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(result.tools.length > 0 || result.parts.length > 0) && (
                <div className="card space-y-1 text-sm">
                  {result.tools.length > 0 && <p><b>Tools:</b> {result.tools.join(", ")}</p>}
                  {result.parts.length > 0 && (
                    <div>
                      <b>Possible parts (verify with the manufacturer before buying):</b>
                      <ul className="list-disc pl-5">{result.parts.map((p, i) => <li key={i}>{p.name}{p.note ? `: ${p.note}` : ""}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              <div className="card space-y-1">
                <h2 className="text-lg font-semibold">Sources</h2>
                {result.sources.length === 0 && <p className="text-sm">No sources were cited.</p>}
                <ul className="space-y-2 text-sm">
                  {result.sources.map((s) => (
                    <li key={s.id}>
                      <a className="font-medium text-blue-700 underline dark:text-blue-400" href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title}</a>
                      <span className="block text-slate-500">{TIER_LABEL[s.tier] ?? s.tier}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="no-print flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => window.print()}>Save as PDF / Print report</button>
                <button className="btn-ghost" onClick={() => { setResult(null); setAnswers([]); }}>New search</button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

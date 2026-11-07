import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Fix it safely, or know when to call a pro</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Choose your product, describe the problem, and get step-by-step checks with sources. The assistant
          asks questions first and clearly separates likely causes from confirmed faults.
        </p>
        <Link href="/troubleshoot" className="btn">
          Find Repair Solution
        </Link>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Sources, not guesses", "Answers cite manuals and support pages found by live search. If none are found, it says so."],
          ["Safety enforced", "Steps involving high voltage, refrigerant, gas or brakes are blocked and sent to a technician."],
          ["Photo help", "Upload a model label or error display and confirm what it read before it is used."],
        ].map(([t, d]) => (
          <div key={t} className="card">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

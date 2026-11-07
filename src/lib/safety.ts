// Backend safety enforcement. Runs on every AI answer, regardless of what the model says.

export type Risk = "user_safe" | "intermediate" | "professional";

const ORDER: Risk[] = ["user_safe", "intermediate", "professional"];

export function maxRisk(a: Risk, b: Risk): Risk {
  return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b;
}

export function isRisk(v: unknown): v is Risk {
  return typeof v === "string" && (ORDER as string[]).includes(v);
}

const PROFESSIONAL_RULES: { re: RegExp; reason: string }[] = [
  {
    re: /refrigerant|freon|\br-?(22|32|410a|134a|600a|290)\b|gas charg|recharge (the )?gas|vacuum pump|manifold gauge|brazing|flare nut/i,
    reason: "Refrigerant work needs a licensed technician and special equipment.",
  },
  {
    re: /compressor|capacitor|high[- ]voltage|\bmains\b|live (wire|wires|terminal|terminals|circuit)|\b(110|115|120|220|230|240|400|415)\s?v\b|measure (the )?voltage|test (the )?voltage|multimeter|megger|insulation test|while (it is |it's )?(plugged in|powered|energi[sz]ed)|with (the )?power on|inverter board|power board|control board|mainboard|power supply unit|\bpsu\b/i,
    reason: "This involves electrical components that can cause shock, fire or injury.",
  },
  {
    re: /bypass|jumper|short(ing)? (out|the|across)|disable (the )?(protection|safety|thermostat|fuse|breaker|interlock|sensor)|remove (the )?(fuse|breaker|safety)/i,
    reason: "Bypassing or disabling a safety protection is never safe.",
  },
  {
    re: /\bgas (leak|line|valve|burner|pipe|hose|regulator|cylinder)\b|\blpg\b|propane|butane|natural gas|pilot (light|flame)/i,
    reason: "Gas appliances can leak or explode and must be serviced by a qualified technician.",
  },
  {
    re: /\bbrake|airbag|\bsrs\b|steering (rack|column|linkage)|fuel (line|pump|rail|tank|injector)|high[- ]voltage battery|hybrid battery|\bev battery\b|suspension spring|timing belt|timing chain/i,
    reason: "Vehicle safety and fuel systems must be repaired by a qualified mechanic.",
  },
  {
    re: /pressuri[sz]ed|boiler|steam (valve|line)|pressure (vessel|tank|switch)|relief valve|hydraulic (line|hose|pump)/i,
    reason: "Pressurized systems can release energy suddenly and cause serious injury.",
  },
  {
    re: /swollen battery|puncture (the )?battery|open (the )?battery|lithium (cell|pack)|soldering|reflow|\bheat gun\b/i,
    reason: "Battery and board-level repair can cause fire or injury.",
  },
];

const INTERMEDIATE_RULES: RegExp[] = [
  /unscrew|remove (the )?(panel|cover|casing|housing|back)|open (the )?(unit|casing|cover|panel|case)|disassembl/i,
  /drain (hose|pump|pipe)|replace (the )?(filter|belt|hose|fuse|battery)/i,
  /outdoor unit|\bcoil\b|\bfan motor\b/i,
];

export function classifyText(text: string): { risk: Risk; reason?: string } {
  for (const rule of PROFESSIONAL_RULES) {
    if (rule.re.test(text)) return { risk: "professional", reason: rule.reason };
  }
  for (const re of INTERMEDIATE_RULES) {
    if (re.test(text)) return { risk: "intermediate" };
  }
  return { risk: "user_safe" };
}

export type RawStep = {
  title: string;
  instructions: string;
  expected: string;
  ifPass: string;
  ifFail: string;
  risk: Risk;
  warnings: string[];
};

export type SafeStep = RawStep & { blocked: boolean; blockReason?: string };

/** Re-classify each step with keyword rules; replace professional-only steps with a stop notice. */
export function enforceSteps(steps: RawStep[]): SafeStep[] {
  return steps.map((s) => {
    const combined = [s.title, s.instructions, s.expected, s.ifPass, s.ifFail].join(" ");
    const found = classifyText(combined);
    const risk = maxRisk(s.risk, found.risk);
    if (risk === "professional") {
      const reason =
        found.reason ?? "This step is rated as unsafe for non-professionals.";
      return {
        title: s.title,
        instructions:
          "STOP. Do not attempt this yourself. This step must be carried out by a qualified technician.",
        expected: "",
        ifPass: "",
        ifFail: "",
        risk,
        warnings: [reason],
        blocked: true,
        blockReason: reason,
      };
    }
    return { ...s, risk, blocked: false };
  });
}

export function overallDifficulty(steps: { risk: Risk }[], technicianRecommended: boolean): Risk {
  let r: Risk = "user_safe";
  for (const s of steps) r = maxRisk(r, s.risk);
  if (technicianRecommended) r = "professional";
  return r;
}

const URGENT_RE =
  /smoke|burning smell|burnt smell|smells? (of )?burn|sparks?|sparking|electric(al)? shock|shocked me|gas smell|smell(s)? (of )?gas|gas leak|on fire|caught fire|flames?|melting|melted|swollen|bulging|exploded|water (in|inside|near) (the )?(socket|outlet|breaker|panel|wiring)/i;

export function detectUrgent(text: string): string | null {
  if (URGENT_RE.test(text)) {
    return "Your description mentions smoke, burning, sparks, gas, shock or a swollen battery. Stop using the product, switch it off at the wall only if that is safe, keep people and pets away, and call a qualified technician or emergency services if there is a fire or gas smell.";
  }
  return null;
}

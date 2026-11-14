import type { ScenarioInput, MoneyUnit, DisplayUnit, ScenarioMode } from "@/types/finance";
import defaults from "@/data/defaultAssumptions.json";

const DEFAULT_UF = defaults.ufFallbackCLP;

function safeNum(v: string | null, fallback?: number): number | undefined {
  if (v == null) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function safeUnit(v: string | null, fallback: MoneyUnit): MoneyUnit {
  return v === "CLP" || v === "UF" ? v : fallback;
}

function safeDisplay(v: string | null): DisplayUnit {
  return v === "CLP" || v === "UF" || v === "BOTH" ? v : "BOTH";
}

function safeMode(v: string | null): ScenarioMode {
  if (v === "income" || v === "target_property") return v;
  return "income";
}

export function encodeScenarioToURL(input: ScenarioInput): string {
  const p = new URLSearchParams();
  p.set("m", input.mode);
  if (input.netMonthlyIncomeAmount != null) p.set("inc", String(input.netMonthlyIncomeAmount));
  p.set("incU", input.netMonthlyIncomeUnit);
  if (input.savingsAmount != null) p.set("sav", String(input.savingsAmount));
  p.set("savU", input.savingsUnit);
  if (input.targetPropertyAmount != null) p.set("prop", String(input.targetPropertyAmount));
  p.set("propU", input.targetPropertyUnit);
  p.set("t", String(input.termYears));
  p.set("dp", String(input.downPaymentPct));
  p.set("r", String(input.annualRatePct));
  p.set("cae", String(input.caePct));
  p.set("ins", String(input.monthlyInsuranceUF));
  p.set("dr", String(input.maxDividendIncomeRatioPct));
  p.set("mf", String(input.maxFinancingPct));
  p.set("du", input.displayUnit);
  p.set("bank", input.selectedBankId);
  p.set("gc", input.reserveClosingCosts ? "1" : "0");
  return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
}

export function decodeScenarioFromURL(search: string): Partial<ScenarioInput> {
  const p = new URLSearchParams(search);
  const partial: Partial<ScenarioInput> = {};

  const mode = p.get("m");
  if (mode) partial.mode = safeMode(mode);

  const inc = safeNum(p.get("inc"));
  if (inc != null) partial.netMonthlyIncomeAmount = inc;
  partial.netMonthlyIncomeUnit = safeUnit(p.get("incU"), "CLP");

  const sav = safeNum(p.get("sav"));
  if (sav != null) partial.savingsAmount = sav;
  partial.savingsUnit = safeUnit(p.get("savU"), "CLP");

  const prop = safeNum(p.get("prop"));
  if (prop != null) partial.targetPropertyAmount = prop;
  partial.targetPropertyUnit = safeUnit(p.get("propU"), "UF");

  const t = safeNum(p.get("t"));
  if (t != null) partial.termYears = t;

  const dp = safeNum(p.get("dp"));
  if (dp != null) partial.downPaymentPct = dp;

  const r = safeNum(p.get("r"));
  if (r != null) partial.annualRatePct = r;

  const cae = safeNum(p.get("cae"));
  if (cae != null) partial.caePct = cae;

  const ins = safeNum(p.get("ins"));
  if (ins != null) partial.monthlyInsuranceUF = ins;

  const dr = safeNum(p.get("dr"));
  if (dr != null) partial.maxDividendIncomeRatioPct = dr;

  const mf = safeNum(p.get("mf"));
  if (mf != null) partial.maxFinancingPct = mf;

  const du = p.get("du");
  if (du) partial.displayUnit = safeDisplay(du);

  const bank = p.get("bank");
  if (bank) partial.selectedBankId = bank;

  const gc = p.get("gc");
  if (gc === "0" || gc === "1") partial.reserveClosingCosts = gc === "1";

  partial.ufValueCLP = DEFAULT_UF;

  return partial;
}

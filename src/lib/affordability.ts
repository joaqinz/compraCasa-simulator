import type {
  ScenarioInput,
  ScenarioOutput,
  BindingConstraint,
  AffordabilityStatus,
} from "@/types/finance";
import { toUF } from "./money";
import {
  calculateMonthlyPaymentUF,
  calculateFullDividendUF,
  calculateRequiredIncomeUF,
  calculateDownPaymentUF,
  calculateLoanAmountUF,
  reverseMaxLoanUF,
} from "./mortgage";

const YELLOW_GAP_THRESHOLD = 0.10; // within 10% = yellow
const GREEN_EXCESS_THRESHOLD = 0.05; // more than 5% headroom = green
export const AFFORDABILITY_TOLERANCE_UF = 1;

export function runScenario(input: ScenarioInput): ScenarioOutput {
  const {
    ufValueCLP,
    netMonthlyIncomeAmount,
    netMonthlyIncomeUnit,
    savingsAmount,
    savingsUnit,
    targetPropertyAmount,
    targetPropertyUnit,
    termYears,
    annualRatePct,
    monthlyInsuranceUF,
    maxDividendIncomeRatioPct,
  } = input;

  const incomeUF = netMonthlyIncomeAmount != null
    ? toUF(netMonthlyIncomeAmount, netMonthlyIncomeUnit, ufValueCLP)
    : undefined;

  const savingsUF = savingsAmount != null
    ? toUF(savingsAmount, savingsUnit, ufValueCLP)
    : undefined;

  const effectiveEquityRatio = getEffectiveEquityRatio(input);
  const loanRatio = 1 - effectiveEquityRatio;

  // Max loan the income supports (dividend + insurance ≤ income · carga)
  let maxLoanByIncomeUF: number | undefined;
  if (incomeUF != null) {
    const maxBaseDividend = incomeUF * (maxDividendIncomeRatioPct / 100) - monthlyInsuranceUF;
    maxLoanByIncomeUF = maxBaseDividend > 0
      ? reverseMaxLoanUF(maxBaseDividend, annualRatePct, termYears)
      : 0;
  }

  // Max property by savings: savings cover the minimum pie
  const maxPropertyBySavingsUF = savingsUF != null && effectiveEquityRatio > 0
    ? savingsUF / effectiveEquityRatio
    : undefined;

  // Max property by income: max loan + every peso of savings used as pie.
  // Without savings data, assume the minimum pie.
  let maxPropertyByIncomeUF: number | undefined;
  if (maxLoanByIncomeUF != null) {
    if (savingsUF != null) {
      maxPropertyByIncomeUF = maxLoanByIncomeUF + savingsUF;
    } else if (loanRatio > 0) {
      maxPropertyByIncomeUF = maxLoanByIncomeUF / loanRatio;
    } else {
      maxPropertyByIncomeUF = 0;
    }
  }

  const realisticMaxPropertyUF =
    maxPropertyByIncomeUF != null && maxPropertyBySavingsUF != null
      ? Math.min(maxPropertyByIncomeUF, maxPropertyBySavingsUF)
      : maxPropertyByIncomeUF ?? maxPropertyBySavingsUF;

  if (input.mode === "income") {
    const bindingConstraint = deriveBindingConstraint(maxPropertyByIncomeUF, maxPropertyBySavingsUF);
    const propertyPriceUF = realisticMaxPropertyUF;
    let loanAmountUF: number | undefined;
    let downPaymentUF: number | undefined;
    if (propertyPriceUF != null) {
      // With savings, the whole saving goes to the pie (max property is always ≥ savings).
      loanAmountUF = savingsUF != null
        ? Math.max(0, propertyPriceUF - savingsUF)
        : propertyPriceUF * loanRatio;
      downPaymentUF = propertyPriceUF - loanAmountUF;
    }
    const baseMonthlyDividendUF = loanAmountUF != null
      ? calculateMonthlyPaymentUF(loanAmountUF, annualRatePct, termYears)
      : undefined;
    const fullMonthlyDividendUF = baseMonthlyDividendUF != null
      ? calculateFullDividendUF(baseMonthlyDividendUF, monthlyInsuranceUF)
      : undefined;
    const requiredIncomeUF = fullMonthlyDividendUF != null
      ? calculateRequiredIncomeUF(fullMonthlyDividendUF, maxDividendIncomeRatioPct)
      : undefined;

    return {
      propertyPriceUF,
      downPaymentUF,
      minDownPaymentUF: propertyPriceUF != null ? propertyPriceUF * effectiveEquityRatio : undefined,
      loanAmountUF,
      baseMonthlyDividendUF,
      fullMonthlyDividendUF,
      requiredIncomeUF,
      maxLoanByIncomeUF,
      maxPropertyByIncomeUF,
      maxPropertyBySavingsUF,
      realisticMaxPropertyUF,
      bindingConstraint,
      feasible: realisticMaxPropertyUF != null && realisticMaxPropertyUF > 0,
    };
  }

  // target_property mode
  if (targetPropertyAmount == null) {
    return { bindingConstraint: "none", feasible: false };
  }

  const propertyPriceUF = toUF(targetPropertyAmount, targetPropertyUnit, ufValueCLP);
  const downPaymentUF = calculateDownPaymentUF(propertyPriceUF, effectiveEquityRatio * 100);
  const loanAmountUF = calculateLoanAmountUF(propertyPriceUF, effectiveEquityRatio * 100);
  const baseMonthlyDividendUF = calculateMonthlyPaymentUF(loanAmountUF, annualRatePct, termYears);
  const fullMonthlyDividendUF = calculateFullDividendUF(baseMonthlyDividendUF, monthlyInsuranceUF);
  const requiredIncomeUF = calculateRequiredIncomeUF(fullMonthlyDividendUF, maxDividendIncomeRatioPct);

  const incomeGapUF = incomeUF != null ? requiredIncomeUF - incomeUF : undefined;
  const savingsGapUF = savingsUF != null ? downPaymentUF - savingsUF : undefined;

  const incomeShort = incomeGapUF != null && incomeGapUF > AFFORDABILITY_TOLERANCE_UF;
  const savingsShort = savingsGapUF != null && savingsGapUF > AFFORDABILITY_TOLERANCE_UF;
  const feasible = !incomeShort && !savingsShort;

  const bindingConstraint: BindingConstraint =
    incomeShort && savingsShort
      ? "income_and_savings"
      : incomeShort
        ? "income"
        : savingsShort
          ? "savings"
          : "none";

  // If income falls short, the pie that would bring the loan down to what income supports
  const downPaymentToFitIncomeUF =
    incomeShort && maxLoanByIncomeUF != null
      ? Math.max(downPaymentUF, propertyPriceUF - maxLoanByIncomeUF)
      : undefined;

  return {
    propertyPriceUF,
    downPaymentUF,
    minDownPaymentUF: downPaymentUF,
    loanAmountUF,
    baseMonthlyDividendUF,
    fullMonthlyDividendUF,
    requiredIncomeUF,
    maxLoanByIncomeUF,
    maxPropertyByIncomeUF,
    maxPropertyBySavingsUF,
    realisticMaxPropertyUF,
    incomeGapUF,
    savingsGapUF,
    downPaymentToFitIncomeUF,
    bindingConstraint,
    feasible,
  };
}

export function getEffectiveEquityRatio(input: Pick<ScenarioInput, "downPaymentPct" | "maxFinancingPct">): number {
  return Math.max(input.downPaymentPct / 100, 1 - input.maxFinancingPct / 100);
}

function deriveBindingConstraint(
  byIncome: number | undefined,
  bySavings: number | undefined
): BindingConstraint {
  if (byIncome == null || bySavings == null) return "none";
  if (byIncome < bySavings) return "income";
  if (bySavings < byIncome) return "savings";
  return "none";
}

export function deriveAffordabilityStatus(
  output: ScenarioOutput,
  input: ScenarioInput
): AffordabilityStatus {
  if (
    input.mode === "target_property" &&
    input.netMonthlyIncomeAmount == null &&
    output.bindingConstraint !== "bank_policy"
  ) {
    return "neutral";
  }

  if (!output.feasible) {
    const incomeGapRatio =
      output.incomeGapUF != null && output.requiredIncomeUF
        ? output.incomeGapUF / output.requiredIncomeUF
        : null;
    const savingsGapRatio =
      output.savingsGapUF != null && output.downPaymentUF
        ? output.savingsGapUF / output.downPaymentUF
        : null;

    const maxGap = Math.max(incomeGapRatio ?? 0, savingsGapRatio ?? 0);
    return maxGap <= YELLOW_GAP_THRESHOLD ? "yellow" : "red";
  }

  // Income mode answers "what's my max": it sits at the limit by definition, so no "Justo" warning.
  if (input.mode === "income") return "green";

  const hasNarrowGap = [output.incomeGapUF, output.savingsGapUF].some(
    (gap) => gap != null && gap > 0 && gap <= AFFORDABILITY_TOLERANCE_UF
  );
  if (hasNarrowGap) return "yellow";

  // feasible — check headroom
  const incomeUF =
    input.netMonthlyIncomeAmount != null
      ? input.netMonthlyIncomeAmount / (input.netMonthlyIncomeUnit === "CLP" ? input.ufValueCLP : 1)
      : null;

  if (output.requiredIncomeUF != null && incomeUF != null) {
    const headroom = (incomeUF - output.requiredIncomeUF) / output.requiredIncomeUF;
    if (headroom < GREEN_EXCESS_THRESHOLD) return "yellow";
  }

  return "green";
}

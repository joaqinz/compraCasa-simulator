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
    downPaymentPct,
    annualRatePct,
    monthlyInsuranceUF,
    maxDividendIncomeRatioPct,
    maxFinancingPct,
  } = input;

  const incomeUF = netMonthlyIncomeAmount != null
    ? toUF(netMonthlyIncomeAmount, netMonthlyIncomeUnit, ufValueCLP)
    : undefined;

  const savingsUF = savingsAmount != null
    ? toUF(savingsAmount, savingsUnit, ufValueCLP)
    : undefined;

  const effectiveEquityRatio = Math.max(
    downPaymentPct / 100,
    1 - maxFinancingPct / 100
  );

  // Max property by savings
  const maxPropertyBySavingsUF = savingsUF != null
    ? savingsUF / effectiveEquityRatio
    : undefined;

  // Max property by income
  let maxPropertyByIncomeUF: number | undefined;
  if (incomeUF != null) {
    const availableForMortgage = incomeUF * (maxDividendIncomeRatioPct / 100);
    if (availableForMortgage > 0) {
      const maxBaseDividend = availableForMortgage - monthlyInsuranceUF;
      if (maxBaseDividend > 0) {
        const maxLoan = reverseMaxLoanUF(maxBaseDividend, annualRatePct, termYears);
        const loanRatio = 1 - effectiveEquityRatio;
        maxPropertyByIncomeUF = loanRatio > 0 ? maxLoan / loanRatio : 0;
      } else {
        maxPropertyByIncomeUF = 0;
      }
    } else {
      maxPropertyByIncomeUF = 0;
    }
  }

  const realisticMaxPropertyUF =
    maxPropertyByIncomeUF != null && maxPropertyBySavingsUF != null
      ? Math.min(maxPropertyByIncomeUF, maxPropertyBySavingsUF)
      : maxPropertyByIncomeUF ?? maxPropertyBySavingsUF;

  if (input.mode === "income") {
    const bindingConstraint = deriveBindingConstraint(maxPropertyByIncomeUF, maxPropertyBySavingsUF, undefined);
    const propertyPriceUF = realisticMaxPropertyUF;
    const downPaymentUF = propertyPriceUF != null
      ? calculateDownPaymentUF(propertyPriceUF, effectiveEquityRatio * 100)
      : undefined;
    const loanAmountUF = propertyPriceUF != null
      ? calculateLoanAmountUF(propertyPriceUF, effectiveEquityRatio * 100)
      : undefined;
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
      loanAmountUF,
      baseMonthlyDividendUF,
      fullMonthlyDividendUF,
      requiredIncomeUF,
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
  const requestedFinancingRatio = 1 - effectiveEquityRatio;

  if (requestedFinancingRatio > maxFinancingPct / 100 + 0.001) {
    return {
      propertyPriceUF,
      downPaymentUF,
      bindingConstraint: "bank_policy",
      feasible: false,
    };
  }

  const loanAmountUF = calculateLoanAmountUF(propertyPriceUF, effectiveEquityRatio * 100);
  const baseMonthlyDividendUF = calculateMonthlyPaymentUF(loanAmountUF, annualRatePct, termYears);
  const fullMonthlyDividendUF = calculateFullDividendUF(baseMonthlyDividendUF, monthlyInsuranceUF);
  const requiredIncomeUF = calculateRequiredIncomeUF(fullMonthlyDividendUF, maxDividendIncomeRatioPct);

  const incomeGapUF = incomeUF != null ? requiredIncomeUF - incomeUF : undefined;
  const savingsGapUF = savingsUF != null ? downPaymentUF - savingsUF : undefined;

  const feasible =
    (incomeGapUF == null || incomeGapUF <= AFFORDABILITY_TOLERANCE_UF) &&
    (savingsGapUF == null || savingsGapUF <= AFFORDABILITY_TOLERANCE_UF);

  const bindingConstraint = deriveBindingConstraint(maxPropertyByIncomeUF, maxPropertyBySavingsUF, propertyPriceUF);

  return {
    propertyPriceUF,
    downPaymentUF,
    loanAmountUF,
    baseMonthlyDividendUF,
    fullMonthlyDividendUF,
    requiredIncomeUF,
    maxPropertyByIncomeUF,
    maxPropertyBySavingsUF,
    realisticMaxPropertyUF,
    incomeGapUF,
    savingsGapUF,
    bindingConstraint,
    feasible,
  };
}

function deriveBindingConstraint(
  byIncome: number | undefined,
  bySavings: number | undefined,
  target: number | undefined
): BindingConstraint {
  if (byIncome == null && bySavings == null) return "none";

  if (target != null) {
    const incomeShort = byIncome != null && byIncome < target - AFFORDABILITY_TOLERANCE_UF;
    const savingsShort = bySavings != null && bySavings < target - AFFORDABILITY_TOLERANCE_UF;
    if (incomeShort && savingsShort) return "income_and_savings";
    if (incomeShort) return "income";
    if (savingsShort) return "savings";
    return "none";
  }

  if (byIncome != null && bySavings != null) {
    if (byIncome < bySavings) return "income";
    if (bySavings < byIncome) return "savings";
  }
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

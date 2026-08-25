import type { ScenarioInput, SensitivityRow, BindingConstraint } from "@/types/finance";
import { AFFORDABILITY_TOLERANCE_UF, runScenario } from "./affordability";
import {
  calculateMonthlyPaymentUF,
  calculateFullDividendUF,
  calculateRequiredIncomeUF,
  calculateDownPaymentUF,
  calculateLoanAmountUF,
} from "./mortgage";

export function linspace(min: number, max: number, steps: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < steps; i++) {
    result.push(min + (max - min) * (i / (steps - 1)));
  }
  return result;
}

export type AffordabilityPoint = {
  propertyPriceUF: number;
  downPaymentPct: number;
  requiredIncomeUF: number;
  requiredIncomeCLP: number;
  feasible: boolean;
};

export function generatePropertyPriceRange(
  baseInput: ScenarioInput,
  downPaymentPcts: number[],
  priceRangeUF: [number, number],
  steps: number
): AffordabilityPoint[] {
  const prices = linspace(priceRangeUF[0], priceRangeUF[1], steps);
  const results: AffordabilityPoint[] = [];

  for (const dp of downPaymentPcts) {
    for (const price of prices) {
      const input: ScenarioInput = {
        ...baseInput,
        mode: "target_property",
        targetPropertyAmount: price,
        targetPropertyUnit: "UF",
        downPaymentPct: dp,
      };
      const out = runScenario(input);
      results.push({
        propertyPriceUF: price,
        downPaymentPct: dp,
        requiredIncomeUF: out.requiredIncomeUF ?? 0,
        requiredIncomeCLP: (out.requiredIncomeUF ?? 0) * baseInput.ufValueCLP,
        feasible: out.feasible,
      });
    }
  }
  return results;
}

export type TermPoint = {
  propertyPriceUF: number;
  termYears: number;
  requiredIncomeUF: number;
  requiredIncomeCLP: number;
};

export function generateTermComparison(
  baseInput: ScenarioInput,
  terms: number[],
  priceRangeUF: [number, number],
  steps: number
): TermPoint[] {
  const prices = linspace(priceRangeUF[0], priceRangeUF[1], steps);
  const results: TermPoint[] = [];

  for (const term of terms) {
    for (const price of prices) {
      const input: ScenarioInput = {
        ...baseInput,
        mode: "target_property",
        targetPropertyAmount: price,
        targetPropertyUnit: "UF",
        termYears: term,
      };
      const out = runScenario(input);
      results.push({
        propertyPriceUF: price,
        termYears: term,
        requiredIncomeUF: out.requiredIncomeUF ?? 0,
        requiredIncomeCLP: (out.requiredIncomeUF ?? 0) * baseInput.ufValueCLP,
      });
    }
  }
  return results;
}

export type RatePoint = {
  annualRatePct: number;
  requiredIncomeUF: number;
  requiredIncomeCLP: number;
  dividendUF: number;
};

export type TargetTermPoint = {
  termYears: number;
  requiredIncomeUF: number;
  dividendUF: number;
  feasible: boolean;
};

export function generateRateSensitivity(
  baseInput: ScenarioInput,
  rateOffsets: number[],
  targetPropertyUF: number
): RatePoint[] {
  return rateOffsets.map((offset) => {
    const rate = Math.max(0.1, baseInput.annualRatePct + offset);
    const input: ScenarioInput = {
      ...baseInput,
      mode: "target_property",
      targetPropertyAmount: targetPropertyUF,
      targetPropertyUnit: "UF",
      annualRatePct: rate,
    };
    const out = runScenario(input);
    return {
      annualRatePct: rate,
      requiredIncomeUF: out.requiredIncomeUF ?? 0,
      requiredIncomeCLP: (out.requiredIncomeUF ?? 0) * baseInput.ufValueCLP,
      dividendUF: out.fullMonthlyDividendUF ?? 0,
    };
  });
}

export function generateTargetTermSensitivity(
  baseInput: ScenarioInput,
  terms: number[],
  targetPropertyUF: number
): TargetTermPoint[] {
  const incomeUF =
    baseInput.netMonthlyIncomeAmount != null
      ? baseInput.netMonthlyIncomeAmount /
        (baseInput.netMonthlyIncomeUnit === "CLP" ? baseInput.ufValueCLP : 1)
      : undefined;

  return terms.map((termYears) => {
    const input: ScenarioInput = {
      ...baseInput,
      mode: "target_property",
      targetPropertyAmount: targetPropertyUF,
      targetPropertyUnit: "UF",
      termYears,
    };
    const out = runScenario(input);

    return {
      termYears,
      requiredIncomeUF: out.requiredIncomeUF ?? 0,
      dividendUF: out.fullMonthlyDividendUF ?? 0,
      feasible:
        incomeUF != null
          ? incomeUF >= (out.requiredIncomeUF ?? 0) - AFFORDABILITY_TOLERANCE_UF
          : true,
    };
  });
}

export type HeatmapData = { z: number[][]; x: number[]; y: number[] };

export function generateHeatmapData(
  baseInput: ScenarioInput,
  propertyPriceSteps: number[],
  downPaymentPcts: number[]
): HeatmapData {
  const z: number[][] = downPaymentPcts.map((dp) =>
    propertyPriceSteps.map((price) => {
      const effectiveEquityRatio = Math.max(
        dp / 100,
        1 - baseInput.maxFinancingPct / 100
      );
      const loan = price * (1 - effectiveEquityRatio);
      const base = calculateMonthlyPaymentUF(loan, baseInput.annualRatePct, baseInput.termYears);
      const full = calculateFullDividendUF(base, baseInput.monthlyInsuranceUF);
      const req = calculateRequiredIncomeUF(full, baseInput.maxDividendIncomeRatioPct);
      return req * baseInput.ufValueCLP;
    })
  );
  return { z, x: propertyPriceSteps, y: downPaymentPcts };
}

export type PieRatePoint = {
  downPaymentPct: number;
  annualRatePct: number;
  dividendUF: number;
  requiredIncomeUF: number;
  feasible: boolean;
};

export function generatePieRateSensitivity(
  baseInput: ScenarioInput,
  targetPropertyUF: number,
  downPaymentPcts: number[],
  annualRates: number[]
): PieRatePoint[] {
  const results: PieRatePoint[] = [];
  const incomeUF =
    baseInput.netMonthlyIncomeAmount != null
      ? baseInput.netMonthlyIncomeAmount /
        (baseInput.netMonthlyIncomeUnit === "CLP" ? baseInput.ufValueCLP : 1)
      : undefined;

  for (const dp of downPaymentPcts) {
    for (const rate of annualRates) {
      const effectiveEquityRatio = Math.max(dp / 100, 1 - baseInput.maxFinancingPct / 100);
      const loan = targetPropertyUF * (1 - effectiveEquityRatio);
      const base = calculateMonthlyPaymentUF(loan, rate, baseInput.termYears);
      const dividend = calculateFullDividendUF(base, baseInput.monthlyInsuranceUF);
      const required = calculateRequiredIncomeUF(dividend, baseInput.maxDividendIncomeRatioPct);
      results.push({
        downPaymentPct: dp,
        annualRatePct: rate,
        dividendUF: dividend,
        requiredIncomeUF: required,
        feasible: incomeUF != null ? incomeUF >= required - AFFORDABILITY_TOLERANCE_UF : true,
      });
    }
  }
  return results;
}

// ── Income-mode "push a little" generators ────────────────────────────────

export type TermMaxPoint = {
  termYears: number;
  maxPropertyUF: number;
  bindingConstraint: BindingConstraint;
};

export function generateTermMaxProperty(
  baseInput: ScenarioInput,
  terms: number[]
): TermMaxPoint[] {
  return terms.map((term) => {
    const out = runScenario({ ...baseInput, mode: "income", termYears: term });
    return {
      termYears: term,
      maxPropertyUF: out.realisticMaxPropertyUF ?? 0,
      bindingConstraint: out.bindingConstraint,
    };
  });
}

export type SavingsPoint = {
  savingsUF: number;
  savingsCLP: number;
  maxPropertyUF: number;
  bindingConstraint: BindingConstraint;
};

export function generateSavingsSensitivity(
  baseInput: ScenarioInput,
  savingsStepsUF: number[]
): SavingsPoint[] {
  return savingsStepsUF.map((savUF) => {
    const out = runScenario({ ...baseInput, mode: "income", savingsAmount: savUF, savingsUnit: "UF" });
    return {
      savingsUF: savUF,
      savingsCLP: savUF * baseInput.ufValueCLP,
      maxPropertyUF: out.realisticMaxPropertyUF ?? 0,
      bindingConstraint: out.bindingConstraint,
    };
  });
}

export type RateMaxPoint = {
  annualRatePct: number;
  maxPropertyUF: number;
  bindingConstraint: BindingConstraint;
};

export function generateRateMaxProperty(
  baseInput: ScenarioInput,
  rateOffsets: number[]
): RateMaxPoint[] {
  return rateOffsets.map((offset) => {
    const rate = Math.max(0.1, baseInput.annualRatePct + offset);
    const out = runScenario({ ...baseInput, mode: "income", annualRatePct: rate });
    return {
      annualRatePct: rate,
      maxPropertyUF: out.realisticMaxPropertyUF ?? 0,
      bindingConstraint: out.bindingConstraint,
    };
  });
}

export function generateSensitivityTable(
  baseInput: ScenarioInput,
  propertyPrices: number[]
): SensitivityRow[] {
  const effectiveEquityRatio = Math.max(
    baseInput.downPaymentPct / 100,
    1 - baseInput.maxFinancingPct / 100
  );

  const incomeUF =
    baseInput.netMonthlyIncomeAmount != null
      ? baseInput.netMonthlyIncomeAmount /
        (baseInput.netMonthlyIncomeUnit === "CLP" ? baseInput.ufValueCLP : 1)
      : undefined;

  const savingsUF =
    baseInput.savingsAmount != null
      ? baseInput.savingsAmount / (baseInput.savingsUnit === "CLP" ? baseInput.ufValueCLP : 1)
      : undefined;

  return propertyPrices.map((price) => {
    const dp = calculateDownPaymentUF(price, effectiveEquityRatio * 100);
    const loan = calculateLoanAmountUF(price, effectiveEquityRatio * 100);
    const base = calculateMonthlyPaymentUF(loan, baseInput.annualRatePct, baseInput.termYears);
    const full = calculateFullDividendUF(base, baseInput.monthlyInsuranceUF);
    const req = calculateRequiredIncomeUF(full, baseInput.maxDividendIncomeRatioPct);

    return {
      propertyPriceUF: price,
      downPaymentPct: effectiveEquityRatio * 100,
      downPaymentUF: dp,
      loanAmountUF: loan,
      fullDividendUF: full,
      requiredIncomeUF: req,
      feasible:
        (incomeUF == null || incomeUF >= req - AFFORDABILITY_TOLERANCE_UF) &&
        (savingsUF == null || savingsUF >= dp - AFFORDABILITY_TOLERANCE_UF),
    };
  });
}

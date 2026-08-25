export function calculateMonthlyPaymentUF(
  loanAmountUF: number,
  annualRatePct: number,
  termYears: number
): number {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return loanAmountUF / n;
  const factor = Math.pow(1 + r, n);
  return loanAmountUF * (r * factor) / (factor - 1);
}

export function reverseMaxLoanUF(
  maxDividendUF: number,
  annualRatePct: number,
  termYears: number
): number {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return maxDividendUF * n;
  const factor = Math.pow(1 + r, n);
  return maxDividendUF * (factor - 1) / (r * factor);
}

export function calculateFullDividendUF(
  baseDividendUF: number,
  monthlyInsuranceUF: number
): number {
  return baseDividendUF + monthlyInsuranceUF;
}

/**
 * Simplified CAE for a fixed-rate scenario with a constant monthly insurance.
 * It solves the monthly IRR of the loan cash flows and annualizes it using
 * the Chilean monthly-frequency convention: monthly rate × 12.
 */
export function calculateSimplifiedCaePct(
  loanAmountUF: number,
  annualRatePct: number,
  termYears: number,
  monthlyInsuranceUF: number
): number | undefined {
  if (loanAmountUF <= 0 || termYears <= 0) return undefined;

  const periods = termYears * 12;
  const baseDividendUF = calculateMonthlyPaymentUF(loanAmountUF, annualRatePct, termYears);
  const paymentUF = baseDividendUF + Math.max(0, monthlyInsuranceUF);

  function presentValue(monthlyRate: number): number {
    if (Math.abs(monthlyRate) < 1e-12) return paymentUF * periods;
    return paymentUF * (1 - Math.pow(1 + monthlyRate, -periods)) / monthlyRate;
  }

  let low = -0.9999;
  let high = 1;

  while (presentValue(high) > loanAmountUF && high < 100) {
    high *= 2;
  }

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (low + high) / 2;
    if (presentValue(middle) > loanAmountUF) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return ((low + high) / 2) * 12 * 100;
}

export function calculateRequiredIncomeUF(
  fullDividendUF: number,
  maxDividendIncomeRatioPct: number
): number {
  return fullDividendUF / (maxDividendIncomeRatioPct / 100);
}

export function calculateDownPaymentUF(
  propertyPriceUF: number,
  downPaymentPct: number
): number {
  return propertyPriceUF * (downPaymentPct / 100);
}

export function calculateLoanAmountUF(
  propertyPriceUF: number,
  downPaymentPct: number
): number {
  return propertyPriceUF * (1 - downPaymentPct / 100);
}

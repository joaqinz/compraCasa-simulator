export type MoneyUnit = "CLP" | "UF";
export type DisplayUnit = "CLP" | "UF" | "BOTH";
export type AffordabilityStatus = "green" | "yellow" | "red" | "neutral";
export type BindingConstraint =
  | "income"
  | "savings"
  | "income_and_savings"
  | "bank_policy"
  | "none";

export type ScenarioMode = "income" | "target_property";

export type ScenarioInput = {
  mode: ScenarioMode;
  ufValueCLP: number;

  netMonthlyIncomeAmount?: number;
  netMonthlyIncomeUnit: MoneyUnit;

  savingsAmount?: number;
  savingsUnit: MoneyUnit;

  targetPropertyAmount?: number;
  targetPropertyUnit: MoneyUnit;

  termYears: number;
  downPaymentPct: number;
  annualRatePct: number;
  caePct: number;
  monthlyInsuranceUF: number;
  maxDividendIncomeRatioPct: number;
  maxFinancingPct: number;

  displayUnit: DisplayUnit;
  selectedBankId: string;
};

export type ScenarioOutput = {
  propertyPriceUF?: number;
  downPaymentUF?: number;
  loanAmountUF?: number;
  baseMonthlyDividendUF?: number;
  fullMonthlyDividendUF?: number;
  requiredIncomeUF?: number;
  maxPropertyByIncomeUF?: number;
  maxPropertyBySavingsUF?: number;
  realisticMaxPropertyUF?: number;
  incomeGapUF?: number;
  savingsGapUF?: number;
  bindingConstraint: BindingConstraint;
  feasible: boolean;
};

export type BankPreset = {
  bankId: string;
  bankName: string;
  productName: string;
  maxFinancingPct: number;
  maxDividendIncomeRatioPct: number;
  availableTermsYears: number[];
  source: string;
  termPresets: BankTermPreset[];
};

export type BankTermPreset = {
  termYears: number;
  annualRatePct: number;
  caePct: number;
  monthlyInsuranceUF: number;
  sourceUrl: string;
  lastUpdated: string;
  notes?: string;
};

export type UFMetadata = {
  valueCLP: number;
  date: string;
  source: "SII" | "Mindicador" | "Manual" | "Fallback";
  sourceUrl?: string;
  fetchedAt?: string;
};

export type GlossaryTerm = {
  id: string;
  term: string;
  definition: string;
};

export type SensitivityRow = {
  propertyPriceUF: number;
  downPaymentPct: number;
  downPaymentUF: number;
  loanAmountUF: number;
  fullDividendUF: number;
  requiredIncomeUF: number;
  feasible: boolean;
};

export type DefaultAssumptions = {
  termYears: number;
  downPaymentPct: number;
  annualRatePct: number;
  caePct: number;
  monthlyInsuranceUF: number;
  maxDividendIncomeRatioPct: number;
  maxFinancingPct: number;
  displayUnit: DisplayUnit;
  ufFallbackCLP: number;
  ufFallbackDate: string;
  sensitivityPriceRangeMinUF: number;
  sensitivityPriceRangeMaxUF: number;
  sensitivityPriceSteps: number;
  sensitivityDownPaymentPcts: number[];
  sensitivityTerms: number[];
  sensitivityRateOffsets: number[];
};

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ScenarioInput, UFMetadata } from "@/types/finance";
import defaults from "@/data/defaultAssumptions.json";
import { runScenario, deriveAffordabilityStatus } from "@/lib/affordability";
import {
  generateRateSensitivity,
  generateSensitivityTable,
  generatePieRateSensitivity,
  generateTermMaxProperty,
  generateRateMaxProperty,
  generateTargetTermSensitivity,
} from "@/lib/sensitivity";
import { getUFValue } from "@/lib/ufService";
import { encodeScenarioToURL, decodeScenarioFromURL } from "@/lib/urlParams";
import { toUF } from "@/lib/money";
import { findLowestRatePresetForTerm, firstBankPreset, resolveBankTermPreset } from "@/lib/bankPresets";

import { UFStatusBar } from "@/components/UFStatusBar";
import { ModeSelector } from "@/components/ModeSelector";
import { InputPanel } from "@/components/InputPanel";
import { ResultCards } from "@/components/ResultCards";
import { SensitivityPanel } from "@/components/SensitivityPanel";
import { GlossarySection } from "@/components/GlossarySection";
import { DisclaimerSection } from "@/components/DisclaimerSection";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const FINE_RATE_OFFSETS = Array.from({ length: 41 }, (_, index) =>
  parseFloat((-1 + index * 0.05).toFixed(2))
);

const defaultResolvedPreset =
  findLowestRatePresetForTerm(defaults.termYears) ??
  resolveBankTermPreset(firstBankPreset.bankId, defaults.termYears);

const defaultScenario: ScenarioInput = {
  mode: "income",
  ufValueCLP: defaults.ufFallbackCLP,
  netMonthlyIncomeAmount: undefined,
  netMonthlyIncomeUnit: "CLP",
  savingsAmount: undefined,
  savingsUnit: "CLP",
  targetPropertyAmount: undefined,
  targetPropertyUnit: "UF",
  termYears: defaults.termYears,
  downPaymentPct: defaults.downPaymentPct,
  annualRatePct: defaultResolvedPreset?.term.annualRatePct ?? defaults.annualRatePct,
  caePct: defaultResolvedPreset?.term.caePct ?? defaults.caePct,
  monthlyInsuranceUF: defaultResolvedPreset?.term.monthlyInsuranceUF ?? defaults.monthlyInsuranceUF,
  maxDividendIncomeRatioPct:
    defaultResolvedPreset?.bank.maxDividendIncomeRatioPct ?? defaults.maxDividendIncomeRatioPct,
  maxFinancingPct: defaultResolvedPreset?.bank.maxFinancingPct ?? defaults.maxFinancingPct,
  displayUnit: defaults.displayUnit as "BOTH",
  selectedBankId: defaultResolvedPreset?.bank.bankId ?? firstBankPreset.bankId,
};

type AppState = {
  scenario: ScenarioInput;
  ufMetadata: UFMetadata | null;
  ufLoading: boolean;
  ufError: boolean;
};

type Action =
  | { type: "UPDATE_SCENARIO"; patch: Partial<ScenarioInput> }
  | { type: "SET_UF"; metadata: UFMetadata }
  | { type: "SET_UF_LOADING" }
  | { type: "SET_UF_ERROR" }
  | { type: "LOAD_FROM_URL"; patch: Partial<ScenarioInput> };

type CopyToast = {
  message: string;
  detail?: string;
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "UPDATE_SCENARIO":
    case "LOAD_FROM_URL":
      return { ...state, scenario: { ...state.scenario, ...action.patch } };
    case "SET_UF_LOADING":
      return { ...state, ufLoading: true, ufError: false };
    case "SET_UF":
      return {
        ...state,
        ufMetadata: action.metadata,
        ufLoading: false,
        ufError: false,
        scenario: { ...state.scenario, ufValueCLP: action.metadata.valueCLP },
      };
    case "SET_UF_ERROR":
      return { ...state, ufLoading: false, ufError: true };
  }
}

const initialState: AppState = {
  scenario: defaultScenario,
  ufMetadata: null,
  ufLoading: true,
  ufError: false,
};

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [copyToast, setCopyToast] = useState<CopyToast | null>(null);
  const { scenario, ufMetadata, ufLoading, ufError } = state;
  const latestIncomeRef = useRef({
    amount: scenario.netMonthlyIncomeAmount,
    unit: scenario.netMonthlyIncomeUnit,
  });

  const output = useMemo(() => runScenario(scenario), [scenario]);
  const status = useMemo(() => deriveAffordabilityStatus(output, scenario), [output, scenario]);

  const targetPropertyUF = useMemo(
    () =>
      scenario.targetPropertyAmount != null
        ? toUF(scenario.targetPropertyAmount, scenario.targetPropertyUnit, scenario.ufValueCLP)
        : 0,
    [scenario.targetPropertyAmount, scenario.targetPropertyUnit, scenario.ufValueCLP]
  );

  const hasValidInputs = useMemo(() => {
    const hasIncome = (scenario.netMonthlyIncomeAmount ?? 0) > 0;

    if (scenario.mode === "target_property") {
      return hasIncome && (scenario.targetPropertyAmount ?? 0) > 0;
    }

    return hasIncome && (scenario.savingsAmount ?? 0) > 0;
  }, [scenario]);

  const emptyStateCopy =
    scenario.mode === "target_property"
      ? "Ingresa tu ingreso y el precio objetivo para ver resultados y sensibilidades."
      : "Ingresa tu ingreso y tus ahorros para ver resultados y sensibilidades.";

  function applyPresetForSelectedBank(base: ScenarioInput, patch: Partial<ScenarioInput>): Partial<ScenarioInput> {
    const nextScenario = { ...base, ...patch };

    if (nextScenario.selectedBankId === "manual") {
      return patch;
    }

    const shouldPickLowestForTerm =
      "termYears" in patch && patch.termYears != null && !("selectedBankId" in patch);

    const resolvedPreset = shouldPickLowestForTerm
      ? findLowestRatePresetForTerm(nextScenario.termYears)
      : resolveBankTermPreset(nextScenario.selectedBankId, nextScenario.termYears);

    if (!resolvedPreset) {
      return patch;
    }

    return {
      ...patch,
      selectedBankId: resolvedPreset.bank.bankId,
      annualRatePct: resolvedPreset.term.annualRatePct,
      caePct: resolvedPreset.term.caePct,
      monthlyInsuranceUF: resolvedPreset.term.monthlyInsuranceUF,
      maxFinancingPct: resolvedPreset.bank.maxFinancingPct,
    };
  }

  function syncSavingsPie(
    patch: Partial<ScenarioInput>,
    current: ScenarioInput,
    currentOutput: typeof output
  ): Partial<ScenarioInput> {
    if (current.mode !== "income") return patch;
    if (!currentOutput.maxPropertyByIncomeUF || currentOutput.maxPropertyByIncomeUF <= 0) return patch;

    const maxLoanUF = currentOutput.maxPropertyByIncomeUF * (1 - current.downPaymentPct / 100);
    const savingsChanged = ("savingsAmount" in patch || "savingsUnit" in patch) && !("downPaymentPct" in patch);
    const pieChanged = "downPaymentPct" in patch && !("savingsAmount" in patch);

    if (savingsChanged) {
      const amount = patch.savingsAmount ?? current.savingsAmount;
      const unit = patch.savingsUnit ?? current.savingsUnit;

      if (amount != null && amount > 0) {
        const savingsUF = unit === "UF" ? amount : amount / current.ufValueCLP;
        const rawPct = (savingsUF / (maxLoanUF + savingsUF)) * 100;
        const clamped = Math.max(10, Math.min(40, Math.round(rawPct / 5) * 5));
        return { ...patch, downPaymentPct: clamped };
      }
    }

    if (pieChanged) {
      const newPie = patch.downPaymentPct ?? current.downPaymentPct;
      const newMaxPropertyUF = maxLoanUF / (1 - newPie / 100);
      const impliedSavingsCLP = Math.round(newMaxPropertyUF * (newPie / 100) * current.ufValueCLP);
      return { ...patch, savingsAmount: impliedSavingsCLP, savingsUnit: "CLP" };
    }

    return patch;
  }

  function handleChange(patch: Partial<ScenarioInput>) {
    let nextPatch = patch;

    if ("netMonthlyIncomeAmount" in patch || "netMonthlyIncomeUnit" in patch) {
      latestIncomeRef.current = {
        amount: "netMonthlyIncomeAmount" in patch ? patch.netMonthlyIncomeAmount : latestIncomeRef.current.amount,
        unit: patch.netMonthlyIncomeUnit ?? latestIncomeRef.current.unit,
      };
    }

    if ("mode" in patch && !("netMonthlyIncomeAmount" in patch) && !("netMonthlyIncomeUnit" in patch)) {
      nextPatch = {
        ...patch,
        netMonthlyIncomeAmount: latestIncomeRef.current.amount,
        netMonthlyIncomeUnit: latestIncomeRef.current.unit,
      };
    }

    const presetAwarePatch = applyPresetForSelectedBank(scenario, nextPatch);
    dispatch({ type: "UPDATE_SCENARIO", patch: syncSavingsPie(presetAwarePatch, scenario, output) });
  }

  function handleManualUF(value: number) {
    dispatch({
      type: "SET_UF",
      metadata: { valueCLP: value, date: new Date().toISOString().split("T")[0], source: "Manual" },
    });
  }

  async function handleCopyScenario() {
    const url = encodeScenarioToURL(scenario);
    const warningKey = "share-scenario-warning-seen";
    const showWarning = !window.localStorage.getItem(warningKey);

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    } else {
      window.prompt("Copia este enlace:", url);
    }

    if (showWarning) {
      window.localStorage.setItem(warningKey, "true");
    }

    setCopyToast({
      message: "Link copiado · incluye tus datos actuales",
      detail: showWarning ? "Tu ingreso y ahorros se incluyen en el link. No lo compartas en redes públicas." : undefined,
    });
  }

  useEffect(() => {
    if (window.location.search) {
      const patch = applyPresetForSelectedBank(defaultScenario, decodeScenarioFromURL(window.location.search));
      dispatch({ type: "LOAD_FROM_URL", patch });
    }
  }, []);

  useEffect(() => {
    latestIncomeRef.current = {
      amount: scenario.netMonthlyIncomeAmount,
      unit: scenario.netMonthlyIncomeUnit,
    };
  }, [scenario.netMonthlyIncomeAmount, scenario.netMonthlyIncomeUnit]);

  useEffect(() => {
    dispatch({ type: "SET_UF_LOADING" });
    getUFValue()
      .then((metadata) => {
        dispatch({ type: "SET_UF", metadata });
      })
      .catch(() => {
        dispatch({ type: "SET_UF_ERROR" });
      });
  }, []);

  useEffect(() => {
    if (!copyToast) return;

    const timer = window.setTimeout(() => setCopyToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [copyToast]);

  const termMaxData = useMemo(
    () => (scenario.mode === "income" ? generateTermMaxProperty(scenario, defaults.sensitivityTerms) : []),
    [scenario]
  );

  const targetTermData = useMemo(
    () =>
      scenario.mode === "target_property"
        ? generateTargetTermSensitivity(scenario, defaults.sensitivityTerms, targetPropertyUF)
        : [],
    [scenario, targetPropertyUF]
  );

  const rateMaxData = useMemo(
    () => (scenario.mode === "income" ? generateRateMaxProperty(scenario, defaults.sensitivityRateOffsets) : []),
    [scenario]
  );

  const rateData = useMemo(
    () =>
      scenario.mode === "target_property"
        ? generateRateSensitivity(scenario, FINE_RATE_OFFSETS, targetPropertyUF)
        : [],
    [scenario, targetPropertyUF]
  );

  const pieRateData = useMemo(() => {
    if (scenario.mode !== "target_property") return [];

    const rates = defaults.sensitivityRateOffsets.map((offset) => Math.max(0.1, scenario.annualRatePct + offset));
    return generatePieRateSensitivity(scenario, targetPropertyUF, [10, 15, 20, 25, 30, 40], rates);
  }, [scenario, targetPropertyUF]);

  const tableRows = useMemo(() => {
    const prices = Array.from({ length: 12 }, (_, index) => 1000 + index * 500);
    return generateSensitivityTable(scenario, prices);
  }, [scenario]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <UFStatusBar metadata={ufMetadata} loading={ufLoading} error={ufError} onManualOverride={handleManualUF} />

      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Simulador Hipotecario Chile</h1>
              <p className="mt-0.5 text-sm text-slate-500">Simulador chileno de capacidad hipotecaria en UF</p>
            </div>
            <button
              type="button"
              onClick={handleCopyScenario}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Compartir escenario
            </button>
          </div>
          <div className="mt-4">
            <ModeSelector mode={scenario.mode} onChange={(mode) => handleChange({ mode })} />
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <InputPanel scenario={scenario} onChange={handleChange} />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        {!hasValidInputs ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {emptyStateCopy}
          </div>
        ) : (
          <>
            <ResultCards output={output} input={scenario} status={status} />
            <ErrorBoundary>
              <SensitivityPanel
                key={scenario.mode}
                termMaxData={termMaxData}
                targetTermData={targetTermData}
                rateMaxData={rateMaxData}
                maxPropertyByIncomeUF={output.maxPropertyByIncomeUF}
                rateData={rateData}
                pieRateData={pieRateData}
                targetPropertyUF={targetPropertyUF}
                tableRows={tableRows}
                input={scenario}
                highlightPropertyUF={output.realisticMaxPropertyUF ?? output.propertyPriceUF}
              />
            </ErrorBoundary>
          </>
        )}

        <GlossarySection />
        <DisclaimerSection />
      </main>

      {copyToast && (
        <div className="fixed bottom-4 right-4 max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{copyToast.message}</p>
          {copyToast.detail && <p className="mt-1 text-xs text-slate-500">{copyToast.detail}</p>}
        </div>
      )}
    </div>
  );
}

export default App;

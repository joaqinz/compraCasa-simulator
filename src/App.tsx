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
import { calculateSimplifiedCaePct } from "@/lib/mortgage";
import { findLowestCaePresetForTerm, firstBankPreset, resolveBankTermPreset } from "@/lib/bankPresets";

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
  findLowestCaePresetForTerm(defaults.termYears) ??
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
  const calculatedManualCaePct = useMemo(
    () =>
      scenario.selectedBankId === "manual" && output.loanAmountUF != null
        ? calculateSimplifiedCaePct(
            output.loanAmountUF,
            scenario.annualRatePct,
            scenario.termYears,
            scenario.monthlyInsuranceUF
          )
        : undefined,
    [output.loanAmountUF, scenario.selectedBankId, scenario.annualRatePct, scenario.termYears, scenario.monthlyInsuranceUF]
  );

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
      return (scenario.targetPropertyAmount ?? 0) > 0;
    }

    return hasIncome && scenario.savingsAmount != null && scenario.savingsAmount >= 0;
  }, [scenario]);

  const emptyStateCopy =
    scenario.mode === "target_property"
      ? "Ingresa el precio objetivo para ver cuánto ingreso, pie y dividendo necesitas."
      : "Ingresa tu ingreso y tus ahorros para ver resultados y sensibilidades.";

  function applyPresetForSelectedBank(base: ScenarioInput, patch: Partial<ScenarioInput>): Partial<ScenarioInput> {
    const nextScenario = { ...base, ...patch };

    if (nextScenario.selectedBankId === "manual") {
      return patch;
    }

    const shouldPickLowestForTerm =
      "termYears" in patch && patch.termYears != null && !("selectedBankId" in patch);

    const resolvedPreset = shouldPickLowestForTerm
      ? findLowestCaePresetForTerm(nextScenario.termYears)
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
    dispatch({ type: "UPDATE_SCENARIO", patch: presetAwarePatch });
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
    const referenceUF = scenario.mode === "target_property" ? targetPropertyUF : output.realisticMaxPropertyUF ?? 0;
    if (referenceUF <= 0) return [];

    const stepUF = referenceUF >= 10000 ? Math.max(500, Math.round(referenceUF / 10 / 500) * 500) : 500;
    const startUF = Math.max(500, Math.floor(referenceUF / stepUF) * stepUF - stepUF * 4);
    const prices = Array.from({ length: 9 }, (_, index) => startUF + index * stepUF);

    return generateSensitivityTable(scenario, prices);
  }, [scenario, output.realisticMaxPropertyUF, targetPropertyUF]);

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <UFStatusBar metadata={ufMetadata} loading={ufLoading} error={ufError} onManualOverride={handleManualUF} />

      <header className="hero-shell overflow-hidden px-4 pb-6 pt-5 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">
                CompraCasa <span className="font-normal text-cyan-50/65">· Planifica tu hipotecario con claridad</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyScenario}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Compartir escenario
            </button>
          </div>

          <div className="mt-6 max-w-3xl">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Entiende qué casa puedes comprar y qué necesita tu objetivo.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-5 text-cyan-50/75">
                Ajusta precio, pie, plazo y tasa para entender tu dividendo y el ingreso necesario.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <ModeSelector mode={scenario.mode} onChange={(mode) => handleChange({ mode })} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
          <aside className="surface-card rounded-3xl p-4 sm:p-5 lg:sticky lg:top-5">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Tus datos</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                Configura tu escenario
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Usa solo lo que sabes hoy. Puedes ajustar los supuestos después.
              </p>
            </div>
            <InputPanel
              scenario={scenario}
              onChange={handleChange}
              loanAmountUF={output.loanAmountUF}
              calculatedCaePct={calculatedManualCaePct}
            />
          </aside>

          <section className="min-w-0">
            {!hasValidInputs ? (
              <div className="surface-card rounded-3xl p-8 text-center sm:p-12">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl text-amber-700">⌂</div>
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">{emptyStateCopy}</p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Tu respuesta</p>
                    <p className="mt-1 text-sm text-slate-500">El número que importa para tu decisión hoy.</p>
                  </div>
                  <span className="hidden rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm sm:inline-flex">
                    Actualizado al cambiar tus datos
                  </span>
                </div>
                <ResultCards output={output} input={scenario} status={status} />
                <div className="mt-6">
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
                </div>
              </>
            )}
          </section>
        </div>

        <GlossarySection />
        <DisclaimerSection />
      </main>

      <footer className="border-t border-slate-200/80 bg-white/40 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-[11px] text-slate-400">
          <span>Hecho por Joaquín</span>
          <span aria-hidden="true">·</span>
          <a
            href="https://www.linkedin.com/in/joaquinhc/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-600 hover:underline"
          >
            LinkedIn
          </a>
        </div>
      </footer>

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

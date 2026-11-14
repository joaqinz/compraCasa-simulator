import { lazy, Suspense, useRef, useState } from "react";
import type { ScenarioInput, ScenarioOutput, SensitivityRow } from "@/types/finance";
import { getEffectiveEquityRatio } from "@/lib/affordability";
import type {
  RatePoint,
  PieRatePoint,
  TermMaxPoint,
  RateMaxPoint,
  TargetTermPoint,
} from "@/lib/sensitivity";
import { toUF } from "@/lib/money";
import { getBankPreset } from "@/lib/bankPresets";
import { ScenarioTable } from "./ScenarioTable";
import { PieDownPaymentPanel } from "./PieDownPaymentPanel";
import { RateComparisonPanel } from "./RateComparisonPanel";
import { TermComparisonPanel } from "./TermComparisonPanel";
import { TargetTermComparisonPanel } from "./TargetTermComparisonPanel";
import { SavingsSensitivityPanel } from "./SavingsSensitivityPanel";
import { ErrorBoundary } from "./ui/ErrorBoundary";

type Props = {
  termMaxData: TermMaxPoint[];
  targetTermData: TargetTermPoint[];
  rateMaxData: RateMaxPoint[];
  output: ScenarioOutput;
  rateData: RatePoint[];
  pieRateData: PieRatePoint[];
  targetPropertyUF?: number;
  tableRows: SensitivityRow[];
  input: ScenarioInput;
  highlightPropertyUF?: number;
};

const tabs = ["Por plazo", "Por pie", "Por tasa"];

const RateMaxPropertyChart = lazy(() =>
  import("./charts/RateMaxPropertyChart").then((module) => ({ default: module.RateMaxPropertyChart }))
);

function ChartLoading() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
      Cargando...
    </div>
  );
}

export function SensitivityPanel({
  termMaxData,
  targetTermData,
  rateMaxData,
  output,
  rateData,
  pieRateData,
  targetPropertyUF,
  tableRows,
  input,
  highlightPropertyUF,
}: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [showTable, setShowTable] = useState(true);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isTargetMode = input.mode === "target_property";
  const selectedBankName = getBankPreset(input.selectedBankId)?.bankName ?? "Ingreso manual";

  const currentSavingsUF =
    input.savingsAmount != null ? toUF(input.savingsAmount, input.savingsUnit, input.ufValueCLP) : 0;

  const userIncomeUF =
    input.netMonthlyIncomeAmount != null
      ? toUF(input.netMonthlyIncomeAmount, input.netMonthlyIncomeUnit, input.ufValueCLP)
      : undefined;

  const userSavingsUF = currentSavingsUF > 0 ? currentSavingsUF : undefined;

  function handleTabKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    setActiveTab(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  function renderContent() {
    if (activeTab === 0) {
      return isTargetMode ? (
        <TargetTermComparisonPanel
          data={targetTermData}
          currentTerm={input.termYears}
          ufValueCLP={input.ufValueCLP}
          userIncomeUF={userIncomeUF}
        />
      ) : (
        <TermComparisonPanel data={termMaxData} currentTerm={input.termYears} ufValueCLP={input.ufValueCLP} />
      );
    }

    if (activeTab === 1) {
      return isTargetMode ? (
        <PieDownPaymentPanel
          data={pieRateData}
          currentRate={input.annualRatePct}
          currentPiePct={input.downPaymentPct}
          targetPropertyUF={targetPropertyUF ?? 0}
          maxFinancingPct={input.maxFinancingPct}
          ufValueCLP={input.ufValueCLP}
          userIncomeUF={userIncomeUF}
        />
      ) : (
        <SavingsSensitivityPanel
          output={output}
          currentSavingsUF={currentSavingsUF}
          ufValueCLP={input.ufValueCLP}
          minPiePct={Math.round(getEffectiveEquityRatio(input) * 100)}
        />
      );
    }

    if (isTargetMode) {
      return (
        <RateComparisonPanel
          data={rateData}
          currentRate={input.annualRatePct}
          ufValueCLP={input.ufValueCLP}
          userIncomeUF={userIncomeUF}
        />
      );
    }

    return (
      <Suspense fallback={<ChartLoading />}>
        <RateMaxPropertyChart data={rateMaxData} currentRate={input.annualRatePct} />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50" role="tablist" aria-label="Sensibilidades">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`sensitivity-tab-${index}`}
              role="tab"
              aria-selected={activeTab === index}
              aria-controls={`sensitivity-panel-${index}`}
              type="button"
              onClick={() => setActiveTab(index)}
              onKeyDown={(event) => handleTabKeyDown(index, event)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 ${
                activeTab === index
                  ? "border-b-2 border-blue-500 bg-white text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          <ErrorBoundary
            key={`tab-${activeTab}-${isTargetMode}`}
            fallback={(error) => (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Este panel falló al cargar. El resto del simulador sigue disponible.
                {error?.message && (
                  <div className="mt-2 break-words font-mono text-xs text-amber-900">{error.message}</div>
                )}
              </div>
            )}
          >
            <div id={`sensitivity-panel-${activeTab}`} role="tabpanel" aria-labelledby={`sensitivity-tab-${activeTab}`}>
              {renderContent()}
            </div>
          </ErrorBoundary>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          {showTable ? "Ocultar tabla de escenarios" : "Ver tabla de escenarios"}
        </button>
        {showTable && (
          <div className="mt-3">
            <ScenarioTable
              rows={tableRows}
              ufValueCLP={input.ufValueCLP}
              highlightPropertyUF={highlightPropertyUF}
              userIncomeUF={userIncomeUF}
              userSavingsUF={userSavingsUF}
              currentPiePct={input.downPaymentPct}
              effectivePiePct={getEffectiveEquityRatio(input) * 100}
              termYears={input.termYears}
              bankName={selectedBankName}
              usesAllSavingsAsPie={!isTargetMode}
            />
          </div>
        )}
      </div>
    </div>
  );
}

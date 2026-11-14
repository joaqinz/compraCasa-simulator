import { useRef, useState } from "react";
import type { ScenarioInput, MoneyUnit } from "@/types/finance";
import { MoneyInput } from "./ui/MoneyInput";
import { Tooltip } from "./ui/Tooltip";
import { BankSelector } from "./BankSelector";
import { PieMinimumControl } from "./AdvancedConfig";
import { getBankPreset } from "@/lib/bankPresets";

const TERM_OPTIONS = [15, 20, 25, 30];

type Props = {
  scenario: ScenarioInput;
  onChange: (patch: Partial<ScenarioInput>) => void;
  loanAmountUF?: number;
  calculatedCaePct?: number;
};

function isDesktopViewport() {
  try {
    return window.matchMedia("(min-width: 1024px)").matches;
  } catch {
    return true;
  }
}

export function InputPanel({ scenario, onChange, loanAmountUF, calculatedCaePct }: Props) {
  const { mode } = scenario;
  const termButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // On phones the bank details start collapsed so the result is reachable quickly.
  const [conditionsOpen, setConditionsOpen] = useState(isDesktopViewport);

  function handleTermKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % TERM_OPTIONS.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + TERM_OPTIONS.length) % TERM_OPTIONS.length;
    if (event.key === "ArrowDown") nextIndex = (index + 2) % TERM_OPTIONS.length;
    if (event.key === "ArrowUp") nextIndex = (index - 2 + TERM_OPTIONS.length) % TERM_OPTIONS.length;

    if (nextIndex != null) {
      event.preventDefault();
      termButtonRefs.current[nextIndex]?.focus();
    }
  }

  const conditionsSummary = `${scenario.selectedBankId === "manual" ? "Otra tasa" : getBankPreset(scenario.selectedBankId)?.bankName ?? "Banco"} · ${scenario.annualRatePct
    .toFixed(2)
    .replace(".", ",")}% · dividendo máx. ${scenario.maxDividendIncomeRatioPct}% del sueldo`;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Información base</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Los datos que definen tu punto de partida.</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <MoneyInput
              label="Ingreso mensual neto"
              value={scenario.netMonthlyIncomeAmount}
              unit={scenario.netMonthlyIncomeUnit}
              onValueChange={(value) => onChange({ netMonthlyIncomeAmount: value })}
              onUnitChange={(unit: MoneyUnit) => onChange({ netMonthlyIncomeUnit: unit })}
              placeholder={scenario.netMonthlyIncomeUnit === "CLP" ? "ej. 2.000.000" : "ej. 62,3"}
              tooltipTermId="ingreso-mensual-neto"
            />
          </div>

          {mode === "income" && (
            <MoneyInput
              label="Ahorros disponibles"
              value={scenario.savingsAmount}
              unit={scenario.savingsUnit}
              onValueChange={(value) => onChange({ savingsAmount: value })}
              onUnitChange={(unit: MoneyUnit) => onChange({ savingsUnit: unit })}
              placeholder={scenario.savingsUnit === "CLP" ? "ej. 30.000.000 (vacío = $0)" : "ej. 750"}
              tooltipTermId="pie"
            />
          )}

          {mode === "target_property" && (
            <>
              <MoneyInput
                label="Precio de la propiedad objetivo"
                value={scenario.targetPropertyAmount}
                unit={scenario.targetPropertyUnit}
                onValueChange={(value) => onChange({ targetPropertyAmount: value })}
                onUnitChange={(unit: MoneyUnit) => onChange({ targetPropertyUnit: unit })}
                placeholder={scenario.targetPropertyUnit === "CLP" ? "ej. 140.000.000" : "ej. 3.500"}
                tooltipTermId="precio-objetivo"
              />
              <MoneyInput
                label="Ahorros disponibles (opcional)"
                value={scenario.savingsAmount}
                unit={scenario.savingsUnit}
                onValueChange={(value) => onChange({ savingsAmount: value })}
                onUnitChange={(unit: MoneyUnit) => onChange({ savingsUnit: unit })}
                placeholder={scenario.savingsUnit === "CLP" ? "ej. 30.000.000" : "ej. 750"}
                tooltipTermId="pie"
              />
            </>
          )}

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-teal-700"
              checked={scenario.reserveClosingCosts}
              onChange={(event) => onChange({ reserveClosingCosts: event.target.checked })}
            />
            <span className="text-xs leading-5 text-slate-700">
              <span className="font-medium">Reservar 2% para gastos operacionales</span>
              <Tooltip termId="gastos-operacionales" />
              <span className="block text-slate-500">Notaría, CBR, tasación e impuesto al mutuo. Sale de tus ahorros.</span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Plazo</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Más años baja el dividendo, pero pagas más intereses.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Plazo del crédito">
          {TERM_OPTIONS.map((term, index) => (
            <button
              key={term}
              ref={(element) => {
                termButtonRefs.current[index] = element;
              }}
              type="button"
              aria-pressed={scenario.termYears === term}
              onClick={() => onChange({ termYears: term })}
              onKeyDown={(event) => handleTermKeyDown(index, event)}
              className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                scenario.termYears === term
                  ? "border-teal-700 bg-teal-700 text-white shadow-md shadow-teal-900/15"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50"
              }`}
            >
              {term} años
            </button>
          ))}
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setConditionsOpen((value) => !value)}
          aria-expanded={conditionsOpen}
          aria-controls="conditions-panel"
          className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Banco y condiciones</span>
            {!conditionsOpen && <span className="mt-0.5 block truncate text-[11px] text-slate-500">{conditionsSummary}</span>}
          </span>
          <span className="shrink-0 text-xs font-medium text-blue-700">{conditionsOpen ? "Ocultar" : "Ajustar"}</span>
        </button>

        {conditionsOpen && (
          <div id="conditions-panel" className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/40 p-3">
            <BankSelector
              selectedBankId={scenario.selectedBankId}
              termYears={scenario.termYears}
              annualRatePct={scenario.annualRatePct}
              caePct={scenario.caePct}
              monthlyInsuranceUF={scenario.monthlyInsuranceUF}
              maxFinancingPct={scenario.maxFinancingPct}
              downPaymentPct={scenario.downPaymentPct}
              maxDividendIncomeRatioPct={scenario.maxDividendIncomeRatioPct}
              loanAmountUF={loanAmountUF}
              calculatedCaePct={calculatedCaePct}
              onChange={onChange}
            />
            <PieMinimumControl scenario={scenario} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import clsx from "clsx";
import type { ScenarioInput, MoneyUnit } from "@/types/finance";
import { MoneyInput } from "./ui/MoneyInput";
import { Tooltip } from "./ui/Tooltip";
import { BankSelector } from "./BankSelector";
import { getBankPreset } from "@/lib/bankPresets";
import { formatDecimal } from "@/lib/formatters";

const TERM_OPTIONS = [15, 20, 25, 30];

type Props = {
  scenario: ScenarioInput;
  onChange: (patch: Partial<ScenarioInput>) => void;
  loanAmountUF?: number;
  calculatedCaePct?: number;
};

export function InputPanel({ scenario, onChange, loanAmountUF, calculatedCaePct }: Props) {
  const { mode } = scenario;
  const termButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [conditionsOpen, setConditionsOpen] = useState(false);

  function handleTermKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TERM_OPTIONS.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + TERM_OPTIONS.length) % TERM_OPTIONS.length;
    if (nextIndex != null) {
      event.preventDefault();
      termButtonRefs.current[nextIndex]?.focus();
    }
  }

  const bankLabel =
    scenario.selectedBankId === "manual" ? "Otra tasa" : getBankPreset(scenario.selectedBankId)?.bankName ?? "Banco";

  return (
    <div className="surface-card rounded-2xl p-4 sm:p-5">
      <div
        className={clsx(
          "grid items-end gap-3 sm:grid-cols-2",
          mode === "target_property" ? "lg:grid-cols-[1fr_1fr_1fr_auto]" : "lg:grid-cols-[1fr_1fr_auto]"
        )}
      >
        {mode === "target_property" && (
          <MoneyInput
            label="Precio de la propiedad"
            value={scenario.targetPropertyAmount}
            unit={scenario.targetPropertyUnit}
            onValueChange={(value) => onChange({ targetPropertyAmount: value })}
            onUnitChange={(unit: MoneyUnit) => onChange({ targetPropertyUnit: unit })}
            placeholder={scenario.targetPropertyUnit === "CLP" ? "ej. 140.000.000" : "ej. 3.500"}
            tooltipTermId="precio-objetivo"
          />
        )}
        <MoneyInput
          label="Ingreso mensual neto"
          value={scenario.netMonthlyIncomeAmount}
          unit={scenario.netMonthlyIncomeUnit}
          onValueChange={(value) => onChange({ netMonthlyIncomeAmount: value })}
          onUnitChange={(unit: MoneyUnit) => onChange({ netMonthlyIncomeUnit: unit })}
          placeholder={scenario.netMonthlyIncomeUnit === "CLP" ? "ej. 2.000.000" : "ej. 62,3"}
          tooltipTermId="ingreso-mensual-neto"
        />
        <MoneyInput
          label={mode === "target_property" ? "Ahorros (opcional)" : "Ahorros disponibles"}
          value={scenario.savingsAmount}
          unit={scenario.savingsUnit}
          onValueChange={(value) => onChange({ savingsAmount: value })}
          onUnitChange={(unit: MoneyUnit) => onChange({ savingsUnit: unit })}
          placeholder={scenario.savingsUnit === "CLP" ? "ej. 30.000.000" : "ej. 750"}
          tooltipTermId="pie"
        />

        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <span id="term-label" className="text-sm font-medium text-slate-700">
            Plazo (años)
          </span>
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-slate-300 bg-slate-50 p-0.5" role="group" aria-labelledby="term-label">
            {TERM_OPTIONS.map((term, index) => (
              <button
                key={term}
                ref={(element) => {
                  termButtonRefs.current[index] = element;
                }}
                type="button"
                aria-label={`${term} años`}
                aria-pressed={scenario.termYears === term}
                onClick={() => onChange({ termYears: term })}
                onKeyDown={(event) => handleTermKeyDown(index, event)}
                className={clsx(
                  "whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400",
                  scenario.termYears === term ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                )}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <label
          className={clsx(
            "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            scenario.reserveClosingCosts
              ? "border-teal-200 bg-teal-50 text-teal-900"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-teal-700"
            checked={scenario.reserveClosingCosts}
            onChange={(event) => onChange({ reserveClosingCosts: event.target.checked })}
          />
          Reservar 2% para gastos operacionales
          <Tooltip termId="gastos-operacionales" />
        </label>

        <button
          type="button"
          onClick={() => setConditionsOpen((value) => !value)}
          aria-expanded={conditionsOpen}
          aria-controls="conditions-panel"
          className={clsx(
            "inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400",
            conditionsOpen ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          <span className="shrink-0 whitespace-nowrap font-semibold">Banco y condiciones</span>
          <span className="truncate text-slate-500">
            {bankLabel} · {formatDecimal(scenario.annualRatePct)}% · pie mín. {100 - scenario.maxFinancingPct}% · dividendo máx.{" "}
            {scenario.maxDividendIncomeRatioPct}% del sueldo
          </span>
          <span aria-hidden="true" className={clsx("shrink-0 transition-transform", conditionsOpen && "rotate-180")}>
            ▾
          </span>
        </button>
      </div>

      {conditionsOpen && (
        <div id="conditions-panel" className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <BankSelector
            selectedBankId={scenario.selectedBankId}
            termYears={scenario.termYears}
            annualRatePct={scenario.annualRatePct}
            caePct={scenario.caePct}
            monthlyInsuranceUF={scenario.monthlyInsuranceUF}
            maxFinancingPct={scenario.maxFinancingPct}
            maxDividendIncomeRatioPct={scenario.maxDividendIncomeRatioPct}
            loanAmountUF={loanAmountUF}
            calculatedCaePct={calculatedCaePct}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}

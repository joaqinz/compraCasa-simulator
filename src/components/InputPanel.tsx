import { useRef } from "react";
import type { ScenarioInput, MoneyUnit } from "@/types/finance";
import { MoneyInput } from "./ui/MoneyInput";
import { BankSelector } from "./BankSelector";

const TERM_OPTIONS = [15, 20, 25, 30];

type Props = {
  scenario: ScenarioInput;
  onChange: (patch: Partial<ScenarioInput>) => void;
};

export function InputPanel({ scenario, onChange }: Props) {
  const { mode } = scenario;
  const termButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <p className="mt-1 text-[11px] text-slate-400">
              Puedes sumar el ingreso de tu pareja o co-deudor.
            </p>
          </div>

          {mode === "income" && (
            <MoneyInput
              label="Ahorros disponibles (pie)"
              value={scenario.savingsAmount}
              unit={scenario.savingsUnit}
              onValueChange={(value) => onChange({ savingsAmount: value })}
              onUnitChange={(unit: MoneyUnit) => onChange({ savingsUnit: unit })}
              placeholder={scenario.savingsUnit === "CLP" ? "ej. 30.000.000" : "ej. 750"}
              tooltipTermId="pie"
            />
          )}

          {mode === "target_property" && (
            <MoneyInput
              label="Precio de la propiedad objetivo"
              value={scenario.targetPropertyAmount}
              unit={scenario.targetPropertyUnit}
              onValueChange={(value) => onChange({ targetPropertyAmount: value })}
              onUnitChange={(unit: MoneyUnit) => onChange({ targetPropertyUnit: unit })}
              placeholder={scenario.targetPropertyUnit === "CLP" ? "ej. 140.000.000" : "ej. 3.500"}
              tooltipTermId="precio-objetivo"
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Plazo del crédito</label>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Plazo del crédito">
            {TERM_OPTIONS.map((term, index) => (
              <button
                key={term}
                ref={(element) => {
                  termButtonRefs.current[index] = element;
                }}
                type="button"
                onClick={() => onChange({ termYears: term })}
                onKeyDown={(event) => handleTermKeyDown(index, event)}
                className={`rounded-lg border py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  scenario.termYears === term
                    ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                {term} años
              </button>
            ))}
          </div>
        </div>
      </div>

      <BankSelector
        selectedBankId={scenario.selectedBankId}
        termYears={scenario.termYears}
        annualRatePct={scenario.annualRatePct}
        caePct={scenario.caePct}
        monthlyInsuranceUF={scenario.monthlyInsuranceUF}
        maxFinancingPct={scenario.maxFinancingPct}
        maxDividendIncomeRatioPct={scenario.maxDividendIncomeRatioPct}
        onChange={onChange}
      />
    </div>
  );
}

import { useRef } from "react";
import type { ScenarioInput, MoneyUnit } from "@/types/finance";
import { MoneyInput } from "./ui/MoneyInput";
import { BankSelector } from "./BankSelector";
import { AdvancedConfig } from "./AdvancedConfig";

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
              label="Ahorros disponibles para el pie"
              value={scenario.savingsAmount}
              unit={scenario.savingsUnit}
              onValueChange={(value) => onChange({ savingsAmount: value })}
              onUnitChange={(unit: MoneyUnit) => onChange({ savingsUnit: unit })}
              placeholder={scenario.savingsUnit === "CLP" ? "ej. 30.000.000" : "ej. 750"}
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
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Plazo</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Más años baja el dividendo mensual.</p>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
            {scenario.termYears} años
          </span>
        </div>
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

      <AdvancedConfig scenario={scenario} onChange={onChange} />
    </div>
  );
}

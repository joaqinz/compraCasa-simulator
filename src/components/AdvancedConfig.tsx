import type { ScenarioInput } from "@/types/finance";
import { Tooltip } from "./ui/Tooltip";

type Props = {
  scenario: ScenarioInput;
  onChange: (patch: Partial<ScenarioInput>) => void;
};

/** Minimum pie the user wants to contribute; the bank's minimum still applies if it is higher. */
export function PieMinimumControl({ scenario, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
      <label htmlFor="pie-min-slider" className="flex items-center text-xs font-medium text-slate-700">
        Pie mínimo que quieres aportar <Tooltip termId="pie" />
      </label>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">
        Si el banco exige más, se usa el mínimo del banco. En “Sé cuánto gano” tus ahorros siempre van al pie.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="pie-min-slider"
          type="range"
          min="0"
          max="40"
          step="1"
          className="flex-1 accent-blue-600"
          value={scenario.downPaymentPct}
          onChange={(event) => onChange({ downPaymentPct: parseInt(event.target.value, 10) })}
          aria-valuetext={`${scenario.downPaymentPct}% del valor`}
        />
        <span className="w-10 text-right text-sm font-semibold text-slate-800">{scenario.downPaymentPct}%</span>
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        {[0, 10, 20, 30, 40].map((value) => (
          <span key={value}>{value}%</span>
        ))}
      </div>
    </section>
  );
}

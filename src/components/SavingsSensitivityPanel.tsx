import type { ScenarioOutput } from "@/types/finance";
import { formatUF, formatCLP } from "@/lib/formatters";

type Props = {
  output: ScenarioOutput;
  currentSavingsUF: number;
  ufValueCLP: number;
  minPiePct: number;
  closingPct: number;
};

function Stat({ label, valueUF, ufValueCLP, note }: { label: string; valueUF: number; ufValueCLP: number; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-800">{formatUF(valueUF, 0)}</p>
      <p className="text-xs text-slate-500">{formatCLP(valueUF * ufValueCLP)}</p>
      {note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

export function SavingsSensitivityPanel({ output, currentSavingsUF, ufValueCLP, minPiePct, closingPct }: Props) {
  const propertyUF = output.realisticMaxPropertyUF;
  const minPieUF = output.minDownPaymentUF;
  const maxLoanUF = output.maxLoanByIncomeUF;

  const pieUF = output.downPaymentUF;

  if (propertyUF == null || minPieUF == null || maxLoanUF == null || pieUF == null || currentSavingsUF <= 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Ingresa tu ingreso y tus ahorros para ver cómo tu pie mueve tu propiedad máxima.
      </div>
    );
  }

  const pieAboveMinUF = Math.max(0, pieUF - minPieUF);
  const incomeBinds = output.bindingConstraint === "income";
  const c = closingPct / 100;
  // Each extra UF of savings adds 1/(1+c) UF when income binds, or 1/(minPie+c) UF when the minimum pie binds.
  const perHundredUF = incomeBinds ? 100 / (1 + c) : 100 / Math.max(0.01, minPiePct / 100 + c);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Tu propiedad máxima usa tus ahorros como pie{closingPct > 0 ? `, después de reservar ${closingPct}% para gastos operacionales` : ""}. Todo lo que pongas sobre el pie mínimo reduce el crédito que necesitas.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Pie mínimo del banco"
          valueUF={minPieUF}
          ufValueCLP={ufValueCLP}
          note={`${minPiePct}% de ${formatUF(propertyUF, 0)}.`}
        />
        <Stat
          label="Pie que aportas"
          valueUF={pieUF}
          ufValueCLP={ufValueCLP}
          note={closingPct > 0 ? `De tus ${formatUF(currentSavingsUF, 0)} de ahorro.` : undefined}
        />
        <Stat
          label="Pie sobre el mínimo"
          valueUF={pieAboveMinUF}
          ufValueCLP={ufValueCLP}
          note={pieAboveMinUF > 0 ? "Baja el crédito y el dividendo." : "Tus ahorros solo cubren el mínimo."}
        />
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        Tu ingreso soporta un crédito de hasta <span className="font-semibold">{formatUF(maxLoanUF, 0)}</span>. Cada{" "}
        <span className="font-semibold">100 UF</span> adicionales de ahorro suben tu propiedad máxima en unas{" "}
        <span className="font-semibold">{formatUF(perHundredUF, 0)}</span>
        {incomeBinds ? "." : `, porque hoy te limita el pie mínimo de ${minPiePct}%.`}
      </p>
    </div>
  );
}

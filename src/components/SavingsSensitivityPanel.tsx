import type { ScenarioOutput } from "@/types/finance";
import { formatUF, formatCLP } from "@/lib/formatters";

type Props = {
  output: ScenarioOutput;
  currentSavingsUF: number;
  ufValueCLP: number;
  minPiePct: number;
};

function Stat({ label, valueUF, ufValueCLP, note }: { label: string; valueUF: number; ufValueCLP: number; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-bold text-slate-800">{formatUF(valueUF, 0)}</p>
      <p className="text-xs text-slate-500">{formatCLP(valueUF * ufValueCLP)}</p>
      {note && <p className="mt-1 text-[11px] text-slate-400">{note}</p>}
    </div>
  );
}

export function SavingsSensitivityPanel({ output, currentSavingsUF, ufValueCLP, minPiePct }: Props) {
  const propertyUF = output.realisticMaxPropertyUF;
  const minPieUF = output.minDownPaymentUF;
  const maxLoanUF = output.maxLoanByIncomeUF;

  if (propertyUF == null || minPieUF == null || maxLoanUF == null || currentSavingsUF <= 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Ingresa tu ingreso y tus ahorros para ver cómo tu pie mueve tu propiedad máxima.
      </div>
    );
  }

  const pieAboveMinUF = Math.max(0, currentSavingsUF - minPieUF);
  const incomeBinds = output.bindingConstraint === "income";
  // Each extra UF of savings adds 1 UF when income binds, or 1/minPie UF when the minimum pie binds.
  const perHundredUF = incomeBinds || minPiePct <= 0 ? 100 : 100 / (minPiePct / 100);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Tu propiedad máxima usa todos tus ahorros como pie. Todo lo que pongas sobre el pie mínimo reduce el crédito que necesitas.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Pie mínimo del banco"
          valueUF={minPieUF}
          ufValueCLP={ufValueCLP}
          note={`${minPiePct}% de ${formatUF(propertyUF, 0)}.`}
        />
        <Stat label="Tus ahorros (pie que aportas)" valueUF={currentSavingsUF} ufValueCLP={ufValueCLP} />
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

import type { TargetTermPoint } from "@/lib/sensitivity";
import { formatCLP, formatUF } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  data: TargetTermPoint[];
  currentTerm: number;
  ufValueCLP: number;
  userIncomeUF?: number;
};

export function TargetTermComparisonPanel({ data, currentTerm, ufValueCLP, userIncomeUF }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Ingresa el precio de la propiedad para ver cómo cambia el dividendo según el plazo.
      </div>
    );
  }

  const maxDividend = Math.max(...data.map((point) => point.dividendUF));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        El plazo cambia el dividendo mensual y el ingreso requerido. Un plazo mayor baja la cuota, pero aumenta los
        intereses totales pagados.
      </p>

      <div className="flex flex-col gap-3">
        {data.map((point) => {
          const isCurrent = point.termYears === currentTerm;
          const widthPct = maxDividend > 0 ? (point.dividendUF / maxDividend) * 100 : 0;

          return (
            <div key={point.termYears} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className={clsx("font-medium", isCurrent ? "text-slate-900" : "text-slate-600")}>
                  {point.termYears} años
                  {isCurrent && <span className="ml-1.5 text-[11px] font-semibold text-blue-600">actual</span>}
                </span>
                <span className={clsx("font-semibold", isCurrent ? "text-slate-900" : "text-slate-600")}>
                  {formatUF(point.dividendUF, 2)}
                  <span className="ml-1.5 font-normal text-slate-500">{formatCLP(point.dividendUF * ufValueCLP)}</span>
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={clsx(
                    "h-full rounded-full bg-blue-500 transition-all duration-300",
                    isCurrent && "ring-2 ring-blue-300 ring-offset-1"
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Ingreso requerido: {formatUF(point.requiredIncomeUF, 2)}</span>
                {userIncomeUF != null && (
                  <span className={point.feasible ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>
                    {point.feasible ? "Factible con tu ingreso" : "Todavía fuera de rango"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

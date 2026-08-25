import type { RatePoint } from "@/lib/sensitivity";
import { AFFORDABILITY_TOLERANCE_UF } from "@/lib/affordability";
import { formatUF, formatCLP } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  data: RatePoint[];
  currentRate: number;
  ufValueCLP: number;
  userIncomeUF?: number;
};

export function RateComparisonPanel({ data, currentRate, ufValueCLP, userIncomeUF }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Ingresa el precio de la propiedad para ver este análisis.
      </div>
    );
  }

  const hasIncome = userIncomeUF != null;
  const currentPoint = data.find((point) => Math.abs(point.annualRatePct - currentRate) < 0.01);
  const currentFeasible =
    currentPoint != null && hasIncome
      ? userIncomeUF >= currentPoint.requiredIncomeUF - AFFORDABILITY_TOLERANCE_UF
      : null;
  const bestFeasible =
    hasIncome
      ? data.find((point) => userIncomeUF >= point.requiredIncomeUF - AFFORDABILITY_TOLERANCE_UF)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Cada bloque muestra el dividendo mensual según la tasa que logres negociar. Desplázate para ver el rango de
        tasas alrededor de tu referencia actual.
      </p>

      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6">
        {data.map((point) => {
          const isCurrent = Math.abs(point.annualRatePct - currentRate) < 0.01;
          const feasible =
            hasIncome
              ? userIncomeUF >= point.requiredIncomeUF - AFFORDABILITY_TOLERANCE_UF
              : null;
          const isFirstFeasible =
            hasIncome && feasible && bestFeasible?.annualRatePct === point.annualRatePct && !currentFeasible;

          return (
            <div
              key={point.annualRatePct}
              className={clsx(
                "flex flex-col items-center gap-0.5 rounded-lg border p-2 text-center",
                isCurrent
                  ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                  : feasible === true
                    ? "border-emerald-200 bg-emerald-50/60"
                    : feasible === false
                      ? "border-red-200 bg-red-50/40"
                      : "border-slate-200 bg-white"
              )}
            >
              <span className={clsx("text-xs font-bold leading-tight", isCurrent ? "text-blue-700" : "text-slate-700")}>
                {point.annualRatePct.toFixed(2)}%
              </span>
              <span className="text-[10px] leading-tight text-slate-600">{formatUF(point.dividendUF, 2)}</span>
              <span className="text-[9px] leading-tight text-slate-400">{formatCLP(point.dividendUF * ufValueCLP)}</span>
              {feasible === true && <span className="text-[9px] font-semibold leading-tight text-emerald-600">Sí</span>}
              {feasible === false && <span className="text-[9px] font-semibold leading-tight text-red-500">No</span>}
              {isCurrent && <span className="text-[8px] font-medium leading-tight text-blue-500">actual</span>}
              {isFirstFeasible && <span className="text-[8px] font-medium leading-tight text-emerald-600">mín.</span>}
            </div>
          );
        })}
      </div>

      {hasIncome && bestFeasible && currentFeasible === false && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Si consigues una tasa de <span className="font-semibold">{bestFeasible.annualRatePct.toFixed(2)}%</span>, el
          dividendo bajaría a <span className="font-semibold">{formatUF(bestFeasible.dividendUF, 2)}</span> (
          {formatCLP(bestFeasible.dividendUF * ufValueCLP)}) y la propiedad pasaría a ser factible con tu ingreso.
        </p>
      )}

      {hasIncome && currentFeasible === true && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Con la tasa actual de {currentRate.toFixed(2)}%, la propiedad ya es factible con tu ingreso.
        </p>
      )}
    </div>
  );
}

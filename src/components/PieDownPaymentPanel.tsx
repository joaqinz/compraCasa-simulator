import type { PieRatePoint } from "@/lib/sensitivity";
import { formatUF, formatCLP } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  data: PieRatePoint[];
  currentRate: number;
  currentPiePct: number;
  targetPropertyUF: number;
  maxFinancingPct: number;
  ufValueCLP: number;
  userIncomeUF?: number;
};

type GroupedRow = {
  minRequestedPct: number;
  maxRequestedPct: number;
  effectivePct: number;
  representative: PieRatePoint;
  isCurrent: boolean;
};

export function PieDownPaymentPanel({
  data,
  currentRate,
  currentPiePct,
  targetPropertyUF,
  maxFinancingPct,
  ufValueCLP,
  userIncomeUF,
}: Props) {
  if (targetPropertyUF <= 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Ingresa el precio de la propiedad para ver este análisis.
      </div>
    );
  }

  const filtered = data
    .filter((point) => Math.abs(point.annualRatePct - currentRate) < 0.05)
    .sort((a, b) => a.downPaymentPct - b.downPaymentPct);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No hay datos disponibles.
      </div>
    );
  }

  const hasIncome = userIncomeUF != null;
  const bankMinPiePct = 100 - maxFinancingPct;
  const groupedRows: GroupedRow[] = [];

  for (const point of filtered) {
    const effectivePct = Math.max(point.downPaymentPct, bankMinPiePct);
    const currentGroup = groupedRows[groupedRows.length - 1];

    if (currentGroup && Math.abs(currentGroup.effectivePct - effectivePct) < 0.01) {
      currentGroup.maxRequestedPct = point.downPaymentPct;
      currentGroup.isCurrent = currentGroup.isCurrent || Math.abs(point.downPaymentPct - currentPiePct) < 1;
      continue;
    }

    groupedRows.push({
      minRequestedPct: point.downPaymentPct,
      maxRequestedPct: point.downPaymentPct,
      effectivePct,
      representative: point,
      isCurrent: Math.abs(point.downPaymentPct - currentPiePct) < 1,
    });
  }

  const firstFeasibleIdx = hasIncome ? groupedRows.findIndex((row) => row.representative.feasible) : -1;

  let minSavingsMessage: { text: string; ok: boolean } | null = null;
  if (hasIncome) {
    if (firstFeasibleIdx < 0) {
      minSavingsMessage = {
        text: "Con tu ingreso actual, la propiedad no es factible en ningún nivel de pie evaluado.",
        ok: false,
      };
    } else {
      const firstFeasible = groupedRows[firstFeasibleIdx];
      const minSavingsUF = targetPropertyUF * (firstFeasible.effectivePct / 100);
      minSavingsMessage = {
        text:
          firstFeasibleIdx === 0
            ? "Con tu ingreso actual, la propiedad es factible desde el pie mínimo requerido."
            : `Necesitas al menos ${formatUF(minSavingsUF, 0)} (${formatCLP(minSavingsUF * ufValueCLP)}) de pie para que el dividendo sea factible con tu ingreso.`,
        ok: true,
      };
    }
  }

  const hasCollapsedRows = groupedRows.some((row) => row.maxRequestedPct > row.minRequestedPct);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Cómo cambia el dividendo y la viabilidad según cuánto pie aportes, a la tasa actual y precio objetivo.
      </p>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        El banco financia máximo {maxFinancingPct}% del valor de la propiedad, así que el pie mínimo efectivo es{" "}
        <span className="font-semibold">{bankMinPiePct}%</span>. Cuando indicas un porcentaje menor, el cálculo se ajusta automáticamente.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">Pie %</th>
              <th className="px-3 py-2 text-right font-medium">Ahorro necesario</th>
              <th className="px-3 py-2 text-right font-medium">Dividendo mensual</th>
              <th className="px-3 py-2 text-right font-medium">Ingreso req.</th>
              {hasIncome && <th className="px-3 py-2 text-center font-medium">Estado</th>}
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((row, index) => {
              const { representative } = row;
              const downPaymentUF = targetPropertyUF * (row.effectivePct / 100);
              const isFirstFeasible = hasIncome && index === firstFeasibleIdx && firstFeasibleIdx > 0;
              const incomeGap = hasIncome && !representative.feasible ? representative.requiredIncomeUF - userIncomeUF : 0;
              const label =
                row.maxRequestedPct > row.minRequestedPct
                  ? `${row.minRequestedPct}% - ${row.maxRequestedPct}%¹`
                  : `${row.effectivePct}%`;

              return (
                <tr
                  key={`${row.minRequestedPct}-${row.maxRequestedPct}`}
                  className={clsx(
                    "border-t border-slate-100",
                    row.isCurrent && "bg-blue-50",
                    !row.isCurrent && representative.feasible && hasIncome && "bg-emerald-50/30",
                    !representative.feasible && "bg-red-50/20"
                  )}
                >
                  <td className="px-3 py-2 text-right font-semibold">
                    {label}
                    {row.isCurrent && <span className="ml-1.5 text-[11px] font-medium text-blue-600">actual</span>}
                    {isFirstFeasible && (
                      <span className="ml-1.5 text-[11px] font-medium text-emerald-600">mín. factible</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div>{formatUF(downPaymentUF, 0)}</div>
                    <div className="text-[11px] text-slate-500">{formatCLP(downPaymentUF * ufValueCLP)}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div>{formatUF(representative.dividendUF, 2)}</div>
                    <div className="text-[11px] text-slate-500">{formatCLP(representative.dividendUF * ufValueCLP)}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div>{formatUF(representative.requiredIncomeUF, 2)}</div>
                    <div className="text-[11px] text-slate-500">{formatCLP(representative.requiredIncomeUF * ufValueCLP)}</div>
                  </td>
                  {hasIncome && (
                    <td className="px-3 py-2 text-center">
                      {representative.feasible ? (
                        <span className="font-bold text-emerald-600">Sí</span>
                      ) : (
                        <div>
                          <span className="font-bold text-red-500">No</span>
                          {incomeGap > 0 && (
                            <div className="mt-0.5 whitespace-nowrap text-[11px] text-red-700">
                              Faltan {formatCLP(incomeGap * ufValueCLP)}/mes de ingreso
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasCollapsedRows && (
        <p className="text-[11px] text-slate-500">
          ¹ El banco exige {bankMinPiePct}% pie mínimo; valores debajo se ajustan automáticamente.
        </p>
      )}

      {minSavingsMessage && (
        <p
          className={clsx(
            "rounded-lg px-3 py-2 text-xs",
            minSavingsMessage.ok ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          )}
        >
          {minSavingsMessage.text}
        </p>
      )}
    </div>
  );
}

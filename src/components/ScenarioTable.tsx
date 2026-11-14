import { useState } from "react";
import type { SensitivityRow } from "@/types/finance";
import { formatUF, formatCLP } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  rows: SensitivityRow[];
  ufValueCLP: number;
  highlightPropertyUF?: number;
  userIncomeUF?: number;
  userSavingsUF?: number;
  currentPiePct: number;
  effectivePiePct: number;
  termYears: number;
  bankName: string;
  usesAllSavingsAsPie?: boolean;
};

function MoneyCell({ uf, clp, decimals = 2 }: { uf: number; clp: number; decimals?: 0 | 2 }) {
  return (
    <td className="px-3 py-1.5 text-right">
      <div>{formatUF(uf, decimals)}</div>
      <div className="mt-0.5 text-[10px] text-slate-400">{formatCLP(clp)}</div>
    </td>
  );
}

export function ScenarioTable({
  rows,
  ufValueCLP,
  highlightPropertyUF,
  userIncomeUF,
  userSavingsUF,
  currentPiePct,
  effectivePiePct,
  termYears,
  bankName,
  usesAllSavingsAsPie = false,
}: Props) {
  const [showOnlyFeasible, setShowOnlyFeasible] = useState(false);

  if (rows.length === 0) return null;

  const hasUserData = userIncomeUF != null || userSavingsUF != null;
  const visibleRows = showOnlyFeasible ? rows.filter((row) => row.feasible) : rows;
  const usesBankAdjustedPie = Math.abs(effectivePiePct - currentPiePct) > 0.1;

  function getGap(row: SensitivityRow): { gap: number; kind: "income" | "savings" } | null {
    if (row.feasible) return null;

    const incomeGap = userIncomeUF != null ? row.requiredIncomeUF - userIncomeUF : 0;
    const savingsGap = userSavingsUF != null ? row.downPaymentUF - userSavingsUF : 0;

    if (savingsGap > 0 && savingsGap >= incomeGap) return { gap: savingsGap, kind: "savings" };
    if (incomeGap > 0) return { gap: incomeGap, kind: "income" };
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-medium text-slate-600">Escenarios de compra</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {usesAllSavingsAsPie && userSavingsUF != null
              ? `Usando todo tu ahorro como pie (mínimo ${effectivePiePct.toFixed(0)}%)`
              : `Escenarios a ${effectivePiePct.toFixed(0)}% pie efectivo`}{" "}
            · plazo {termYears} años · banco {bankName}
          </p>
          {usesBankAdjustedPie && (
            <p className="mt-0.5 text-[11px] text-amber-600">
              Tu pie configurado es {currentPiePct.toFixed(0)}%, pero el banco exige al menos {effectivePiePct.toFixed(0)}%.
            </p>
          )}
        </div>

        {hasUserData && (
          <button
            type="button"
            onClick={() => setShowOnlyFeasible((value) => !value)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              showOnlyFeasible
                ? "border-blue-600 bg-blue-600 text-white shadow-inner"
                : "border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:text-slate-800"
            )}
            aria-pressed={showOnlyFeasible}
          >
            {showOnlyFeasible ? "Solo factibles activado" : "Solo mostrar factibles"}
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 sm:hidden">Desliza la tabla para ver todas las columnas.</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">Propiedad</th>
              <th className="px-3 py-2 text-right font-medium">Pie %</th>
              <th className="px-3 py-2 text-right font-medium">Pie</th>
              <th className="px-3 py-2 text-right font-medium">Crédito</th>
              <th className="px-3 py-2 text-right font-medium">Dividendo</th>
              <th className="px-3 py-2 text-right font-medium">Ingreso req.</th>
              <th className="px-3 py-2 text-center font-medium">Factible</th>
              {hasUserData && <th className="px-3 py-2 text-right font-medium">Brecha</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const isHighlighted =
                highlightPropertyUF != null && Math.abs(row.propertyPriceUF - highlightPropertyUF) < 50;
              const gap = getGap(row);

              return (
                <tr
                  key={`${row.propertyPriceUF}-${index}`}
                  className={clsx(
                    "border-t border-slate-100",
                    isHighlighted && "bg-blue-50 font-semibold",
                    !isHighlighted && row.feasible && "bg-emerald-50/30",
                    !row.feasible && "bg-red-50/30"
                  )}
                >
                  <MoneyCell uf={row.propertyPriceUF} clp={row.propertyPriceUF * ufValueCLP} decimals={0} />
                  <td className="px-3 py-1.5 text-right">{row.downPaymentPct.toFixed(0)}%</td>
                  <MoneyCell uf={row.downPaymentUF} clp={row.downPaymentUF * ufValueCLP} />
                  <MoneyCell uf={row.loanAmountUF} clp={row.loanAmountUF * ufValueCLP} decimals={0} />
                  <MoneyCell uf={row.fullDividendUF} clp={row.fullDividendUF * ufValueCLP} />
                  <MoneyCell uf={row.requiredIncomeUF} clp={row.requiredIncomeUF * ufValueCLP} />
                  <td className="px-3 py-1.5 text-center">
                    <span className={row.feasible ? "font-bold text-emerald-600" : "font-bold text-red-500"}>
                      {row.feasible ? "Sí" : "No"}
                    </span>
                  </td>
                  {hasUserData && (
                    <td className="px-3 py-1.5 text-right">
                      {gap ? (
                        <span className={gap.kind === "income" ? "font-medium text-red-500" : "font-medium text-amber-600"}>
                          +{formatCLP(gap.gap * ufValueCLP)}
                        </span>
                      ) : (
                        <span className="text-emerald-500">OK</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

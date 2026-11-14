import { useState } from "react";
import type { SensitivityRow } from "@/types/finance";
import { formatUF, formatCLP } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  rows: SensitivityRow[];
  ufValueCLP: number;
  highlightPropertyUF?: number;
  highlightLabel?: string;
  userIncomeUF?: number;
  userSavingsUF?: number;
  currentPiePct: number;
  effectivePiePct: number;
  termYears: number;
  bankName: string;
  usesAllSavingsAsPie?: boolean;
};

function MoneyCell({ uf, clp, decimals = 0, strong = false }: { uf: number; clp: number; decimals?: 0 | 2; strong?: boolean }) {
  return (
    <td className="px-3 py-1.5 text-right">
      <div className={strong ? "font-semibold text-slate-900" : undefined}>{formatUF(uf, decimals)}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{formatCLP(clp)}</div>
    </td>
  );
}

type Gap = { incomeCLP: number; savingsCLP: number };

export function ScenarioTable({
  rows,
  ufValueCLP,
  highlightPropertyUF,
  highlightLabel = "Tu resultado",
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

  function getGap(row: SensitivityRow): Gap | null {
    if (row.feasible) return null;
    const incomeGap = userIncomeUF != null ? Math.max(0, row.requiredIncomeUF - userIncomeUF) : 0;
    const savingsGap =
      userSavingsUF != null ? Math.max(0, row.downPaymentUF + row.closingCostsUF - userSavingsUF) : 0;
    if (incomeGap <= 0 && savingsGap <= 0) return null;
    return { incomeCLP: incomeGap * ufValueCLP, savingsCLP: savingsGap * ufValueCLP };
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-medium text-slate-600">Escenarios de compra</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {usesAllSavingsAsPie && userSavingsUF != null
              ? `Usando tus ahorros como pie (mínimo ${effectivePiePct.toFixed(0)}%)`
              : `Escenarios a ${effectivePiePct.toFixed(0)}% de pie`}{" "}
            · plazo {termYears} años · {bankName}
          </p>
          {usesBankAdjustedPie && (
            <p className="mt-0.5 text-[11px] text-amber-700">
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
            {showOnlyFeasible ? "Mostrando solo los que te alcanzan" : "Mostrar solo los que te alcanzan"}
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500 sm:hidden">Desliza la tabla para ver todas las columnas.</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-2 text-right font-medium">Propiedad</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Dividendo</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">¿Te alcanza?</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Ingreso req.</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Pie</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Crédito</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const isHighlighted =
                highlightPropertyUF != null && Math.abs(row.propertyPriceUF - highlightPropertyUF) < 0.5;
              const gap = hasUserData ? getGap(row) : null;
              const piePct = row.propertyPriceUF > 0 ? (row.downPaymentUF / row.propertyPriceUF) * 100 : 0;

              return (
                <tr
                  key={`${row.propertyPriceUF}-${index}`}
                  className={clsx(
                    "border-t border-slate-100",
                    isHighlighted && "bg-blue-50",
                    !isHighlighted && row.feasible && "bg-emerald-50/30",
                    !row.feasible && "bg-red-50/30"
                  )}
                >
                  <td className="px-3 py-1.5 text-right">
                    {isHighlighted && (
                      <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        {highlightLabel}
                      </div>
                    )}
                    <div className={isHighlighted ? "font-semibold text-slate-900" : undefined}>
                      {formatUF(row.propertyPriceUF, 0)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{formatCLP(row.propertyPriceUF * ufValueCLP)}</div>
                  </td>
                  <MoneyCell
                    uf={row.fullDividendUF}
                    clp={row.fullDividendUF * ufValueCLP}
                    decimals={2}
                    strong={isHighlighted}
                  />
                  <td className="px-3 py-1.5 text-left">
                    {!hasUserData ? (
                      <span className="text-slate-500">—</span>
                    ) : row.feasible ? (
                      <span className="font-semibold text-emerald-700">Sí</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-red-700">No</span>
                        {gap && gap.incomeCLP > 0 && (
                          <span className="whitespace-nowrap text-[11px] text-red-700">
                            Faltan {formatCLP(gap.incomeCLP)}/mes de ingreso
                          </span>
                        )}
                        {gap && gap.savingsCLP > 0 && (
                          <span className="whitespace-nowrap text-[11px] text-amber-800">
                            Faltan {formatCLP(gap.savingsCLP)} de ahorro
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <MoneyCell uf={row.requiredIncomeUF} clp={row.requiredIncomeUF * ufValueCLP} decimals={2} />
                  <td className="px-3 py-1.5 text-right">
                    <div>{formatUF(row.downPaymentUF, 0)}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{piePct.toFixed(0)}% · {formatCLP(row.downPaymentUF * ufValueCLP)}</div>
                  </td>
                  <MoneyCell uf={row.loanAmountUF} clp={row.loanAmountUF * ufValueCLP} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { PieRatePoint } from "@/lib/sensitivity";
import { formatBoth, formatUF } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  data: PieRatePoint[];
  ufValueCLP: number;
  hasIncome: boolean;
};

export function PieRateSensitivityTable({ data, ufValueCLP, hasIncome }: Props) {
  if (data.length === 0) return null;

  const downPaymentPcts = [...new Set(data.map((d) => d.downPaymentPct))].sort((a, b) => a - b);
  const rates = [...new Set(data.map((d) => d.annualRatePct))].sort((a, b) => a - b);

  function getPoint(dp: number, rate: number): PieRatePoint | undefined {
    return data.find((d) => d.downPaymentPct === dp && d.annualRatePct === rate);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-slate-500">
        Dividendo mensual estimado para cada combinación de pie y tasa anual.
        {hasIncome && " Celdas verdes = ingreso suficiente; rojas = ingreso insuficiente."}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 bg-slate-100 border border-slate-200 font-medium text-slate-600 whitespace-nowrap">
                Pie \ Tasa
              </th>
              {rates.map((r) => (
                <th key={r} className="p-2 bg-slate-100 border border-slate-200 font-medium text-slate-600 whitespace-nowrap text-center">
                  {r.toFixed(2)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {downPaymentPcts.map((dp) => (
              <tr key={dp}>
                <td className="p-2 bg-slate-50 border border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                  {dp}% pie
                </td>
                {rates.map((r) => {
                  const pt = getPoint(dp, r);
                  if (!pt) return <td key={r} className="p-2 border border-slate-200" />;
                  const cellColor = hasIncome
                    ? pt.feasible
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-800"
                    : "bg-white text-slate-800";
                  return (
                    <td key={r} className={clsx("p-2 border border-slate-200 text-center", cellColor)}>
                      <div className="font-semibold">{formatBoth(pt.dividendUF, ufValueCLP)}</div>
                      <div className="text-[11px] opacity-70 mt-0.5">req. {formatUF(pt.requiredIncomeUF, 2)} UF</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

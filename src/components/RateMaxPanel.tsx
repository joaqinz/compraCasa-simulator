import type { RateMaxPoint } from "@/lib/sensitivity";
import { formatUF, formatCLP, formatDecimal } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  data: RateMaxPoint[];
  currentRate: number;
  ufValueCLP: number;
};

function offsetLabel(offset: number) {
  if (Math.abs(offset) < 0.001) return "actual";
  return `${offset > 0 ? "+" : "−"}${formatDecimal(Math.abs(offset), 1)} pt`;
}

export function RateMaxPanel({ data, currentRate, ufValueCLP }: Props) {
  if (data.length === 0 || data.every((point) => point.maxPropertyUF === 0)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Ingresa tu ingreso para ver cómo la tasa afecta lo que puedes comprar.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.maxPropertyUF));
  const current = data.find((point) => Math.abs(point.annualRatePct - currentRate) < 0.001);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Propiedad máxima si consigues una tasa distinta, manteniendo tu ingreso, tus ahorros y el plazo.
      </p>
      <div className="flex flex-col gap-3">
        {data.map((point) => {
          const offset = point.annualRatePct - currentRate;
          const isCurrent = Math.abs(offset) < 0.001;
          const widthPct = maxValue > 0 ? (point.maxPropertyUF / maxValue) * 100 : 0;
          const delta = current ? point.maxPropertyUF - current.maxPropertyUF : 0;

          return (
            <div key={point.annualRatePct} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className={clsx("font-medium", isCurrent ? "text-slate-900" : "text-slate-600")}>
                  {formatDecimal(point.annualRatePct)}%
                  <span className={clsx("ml-1.5 text-[11px]", isCurrent ? "font-semibold text-blue-700" : "text-slate-500")}>
                    {offsetLabel(offset)}
                  </span>
                </span>
                <span className={clsx("text-right font-semibold", isCurrent ? "text-slate-900" : "text-slate-600")}>
                  {formatUF(point.maxPropertyUF, 0)}
                  <span className="ml-1.5 font-normal text-slate-500">{formatCLP(point.maxPropertyUF * ufValueCLP)}</span>
                  {!isCurrent && current && (
                    <span className={clsx("ml-1.5 font-normal", delta >= 0 ? "text-emerald-700" : "text-red-700")}>
                      ({delta >= 0 ? "+" : "−"}
                      {formatUF(Math.abs(delta), 0)})
                    </span>
                  )}
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-300",
                    isCurrent ? "bg-blue-600 ring-2 ring-blue-300 ring-offset-1" : "bg-blue-400"
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="border-t pt-2 text-[11px] text-slate-500">
        Cotiza en varios bancos: medio punto de tasa puede mover tu propiedad máxima en cientos de UF.
      </p>
    </div>
  );
}

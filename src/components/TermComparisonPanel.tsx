import type { TermMaxPoint } from "@/lib/sensitivity";
import { formatUF, formatCLP } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  data: TermMaxPoint[];
  currentTerm: number;
  ufValueCLP: number;
};

export function TermComparisonPanel({ data, currentTerm, ufValueCLP }: Props) {
  if (data.length === 0 || data.every((point) => point.maxPropertyUF === 0)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Ingresa tu ingreso para ver cómo el plazo afecta lo que puedes comprar.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.maxPropertyUF));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">
        Propiedad máxima estimada según el plazo del crédito, manteniendo tu ingreso, tu pie y las condiciones del banco.
      </p>
      <div className="flex flex-col gap-3">
        {data.map((point) => {
          const isCurrent = point.termYears === currentTerm;
          const widthPct = maxValue > 0 ? (point.maxPropertyUF / maxValue) * 100 : 0;

          return (
            <div key={point.termYears} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className={clsx("font-medium", isCurrent ? "text-slate-900" : "text-slate-600")}>
                  {point.termYears} años
                  {isCurrent && <span className="ml-1.5 text-[11px] font-semibold text-blue-600">actual</span>}
                </span>
                <span className={clsx("font-semibold", isCurrent ? "text-slate-900" : "text-slate-600")}>
                  {formatUF(point.maxPropertyUF, 0)}
                  <span className="ml-1.5 font-normal text-slate-500">{formatCLP(point.maxPropertyUF * ufValueCLP)}</span>
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
            </div>
          );
        })}
      </div>
      {data.length >= 2 && (
        <p className="border-t pt-2 text-[11px] text-slate-500">
          Mayor plazo suele bajar el dividendo mensual, pero aumenta los intereses totales pagados.
        </p>
      )}
    </div>
  );
}

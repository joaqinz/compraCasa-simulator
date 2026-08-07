import { useEffect, useRef, useState } from "react";
import { getBankPresetsSortedByCaeForTerm, resolveBankTermPreset } from "@/lib/bankPresets";
import { Tooltip } from "./ui/Tooltip";

type ManualNumberInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  step?: string;
  min?: string;
  max?: string;
  className: string;
};

function ManualNumberInput({
  value,
  onValueChange,
  step,
  min,
  max,
  className,
}: ManualNumberInputProps) {
  const [display, setDisplay] = useState(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDisplay(String(value));
    }
  }, [value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextDisplay = event.target.value;
    setDisplay(nextDisplay);

    if (nextDisplay === "") return;

    const parsed = parseFloat(nextDisplay);
    if (!Number.isNaN(parsed)) {
      onValueChange(parsed);
    }
  }

  function handleBlur() {
    focusedRef.current = false;

    const parsed = parseFloat(display);
    if (!Number.isNaN(parsed)) {
      setDisplay(String(parsed));
      return;
    }

    setDisplay(String(value));
  }

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      className={className}
      value={display}
      onChange={handleChange}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={handleBlur}
    />
  );
}

type Props = {
  selectedBankId: string;
  termYears: number;
  annualRatePct: number;
  caePct: number;
  monthlyInsuranceUF: number;
  maxFinancingPct: number;
  maxDividendIncomeRatioPct: number;
  onChange: (patch: Partial<{
    selectedBankId: string;
    termYears: number;
    annualRatePct: number;
    caePct: number;
    monthlyInsuranceUF: number;
    maxFinancingPct: number;
    maxDividendIncomeRatioPct: number;
  }>) => void;
};

type MetricProps = {
  label: string;
  tooltipTermId?: string;
  children: React.ReactNode;
};

function Metric({ label, tooltipTermId, children }: MetricProps) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center text-[11px] font-medium text-slate-500">
        {label}
        {tooltipTermId && <Tooltip termId={tooltipTermId} />}
      </div>
      <div className="mt-1 min-h-7 text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

export function BankSelector({
  selectedBankId,
  termYears,
  annualRatePct,
  caePct,
  monthlyInsuranceUF,
  maxFinancingPct,
  maxDividendIncomeRatioPct,
  onChange,
}: Props) {
  const isManual = selectedBankId === "manual";
  const selectedPreset = resolveBankTermPreset(selectedBankId, termYears);
  const selectedBank = selectedPreset?.bank;
  const selectedTermPreset = selectedPreset?.term;
  const sortedCaePresets = getBankPresetsSortedByCaeForTerm(termYears);
  const typicalMin = 20;
  const typicalMax = 30;
  const typicalStartPct = ((typicalMin - 15) / (40 - 15)) * 100;
  const typicalEndPct = ((typicalMax - 15) / (40 - 15)) * 100;
  const sliderProgressPct = ((maxDividendIncomeRatioPct - 15) / (40 - 15)) * 100;
  const sliderValueLabelTransform =
    sliderProgressPct < 8 ? "translateX(0)" : sliderProgressPct > 92 ? "translateX(-100%)" : "translateX(-50%)";
  const metricInputClass =
    "h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500";

  function handleBankChange(bankId: string) {
    if (bankId === "manual") {
      onChange({ selectedBankId: "manual" });
      return;
    }

    const preset = resolveBankTermPreset(bankId, termYears);
    if (!preset) return;

    onChange({
      selectedBankId: preset.bank.bankId,
      annualRatePct: preset.term.annualRatePct,
      caePct: preset.term.caePct,
      monthlyInsuranceUF: preset.term.monthlyInsuranceUF,
      maxFinancingPct: preset.bank.maxFinancingPct,
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-slate-700">Banco / Escenario</label>
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              CAE asc.
            </span>
          </div>
          <select
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedBankId}
            onChange={(event) => handleBankChange(event.target.value)}
          >
            {sortedCaePresets.map(({ bank, term }) => (
              <option key={bank.bankId} value={bank.bankId}>
                {bank.bankName} · CAE {term.caePct.toFixed(2)}%
                {term.termYears !== termYears ? ` (${term.termYears} años)` : ""}
              </option>
            ))}
            <option value="manual">Ingreso manual</option>
          </select>
          <p className="mt-1 text-[11px] text-slate-400">Ordenado por CAE para el plazo seleccionado.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Metric label="Tasa anual" tooltipTermId="tasa">
            {isManual ? (
              <ManualNumberInput
                step="0.01"
                min="0"
                max="30"
                className={metricInputClass}
                value={annualRatePct}
                onValueChange={(value) => onChange({ annualRatePct: value })}
              />
            ) : (
              `${annualRatePct.toFixed(2)}%`
            )}
          </Metric>

          <Metric label="CAE" tooltipTermId="cae">
            {isManual ? (
              <ManualNumberInput
                step="0.01"
                min="0"
                max="30"
                className={metricInputClass}
                value={caePct}
                onValueChange={(value) => onChange({ caePct: value })}
              />
            ) : (
              `${caePct.toFixed(2)}%`
            )}
          </Metric>

          <Metric label="Seguro mensual" tooltipTermId="seguro-desgravamen">
            {isManual ? (
              <ManualNumberInput
                step="0.01"
                min="0"
                className={metricInputClass}
                value={monthlyInsuranceUF}
                onValueChange={(value) => onChange({ monthlyInsuranceUF: value })}
              />
            ) : (
              `${monthlyInsuranceUF.toFixed(2)} UF`
            )}
          </Metric>

          <Metric label="Financiamiento" tooltipTermId="financiamiento-maximo">
            {isManual ? (
              <ManualNumberInput
                step="1"
                min="50"
                max="100"
                className={metricInputClass}
                value={maxFinancingPct}
                onValueChange={(value) => onChange({ maxFinancingPct: value })}
              />
            ) : (
              `${maxFinancingPct}%`
            )}
          </Metric>

          <Metric label="Plazos">
            <span className="truncate">
              {selectedBank?.availableTermsYears.join(", ") ?? "15, 20, 25, 30"} años
            </span>
          </Metric>
        </div>
      </div>

      {!isManual && selectedBank && selectedTermPreset && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
          {selectedTermPreset.termYears === termYears ? (
            <span>
              CMF {selectedTermPreset.termYears} años · {selectedTermPreset.lastUpdated}
            </span>
          ) : (
            <span>
              CMF sin escenario {termYears} años; usando {selectedTermPreset.termYears} años
            </span>
          )}
          <a
            href={selectedTermPreset.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            Fuente
          </a>
          <span>Valores referenciales.</span>
        </div>
      )}

      <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 lg:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
        <div>
          <label className="flex items-center text-xs font-medium text-slate-600">
            Carga financiera máxima <Tooltip termId="carga-financiera" />
          </label>
          <p className="mt-1 text-[11px] text-slate-500">
            Actual: <span className="font-semibold text-slate-800">{maxDividendIncomeRatioPct}%</span> del ingreso neto.
            Rango típico: 20%-30%.
          </p>
        </div>

        <div className="relative min-w-0">
          <div className="pointer-events-none absolute left-0 right-0 top-[13px] h-2 rounded-full bg-slate-100">
            <div
              className="absolute h-full rounded-full bg-emerald-100"
              style={{
                left: `${typicalStartPct}%`,
                width: `${typicalEndPct - typicalStartPct}%`,
              }}
            />
            <div className="absolute h-full rounded-full bg-blue-200/70" style={{ width: `${sliderProgressPct}%` }} />
          </div>
          <input
            type="range"
            min="15"
            max="40"
            step="1"
            className="relative z-10 w-full accent-blue-600"
            value={maxDividendIncomeRatioPct}
            onChange={(event) => onChange({ maxDividendIncomeRatioPct: parseInt(event.target.value, 10) })}
            aria-label="Carga financiera máxima"
          />
          <div className="relative mt-1 h-6 text-[11px] text-slate-500">
            <span
              className="absolute top-0 whitespace-nowrap rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700"
              style={{ left: `${sliderProgressPct}%`, transform: sliderValueLabelTransform }}
            >
              Actual {maxDividendIncomeRatioPct}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>15%</span>
            <span>40%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

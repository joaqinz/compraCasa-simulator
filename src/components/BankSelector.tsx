import { useEffect, useRef, useState } from "react";
import { getBankPresetsSortedByCaeForTerm, resolveBankTermPreset } from "@/lib/bankPresets";
import { Tooltip } from "./ui/Tooltip";
import { formatDecimal, formatUF } from "@/lib/formatters";

function toDisplay(value: number) {
  return String(value).replace(".", ",");
}

function parseDecimal(text: string) {
  const trimmed = text.trim();
  // Accept both "3,3" (es-CL) and "3.3"; a comma marks the decimal separator when present.
  return parseFloat(trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed);
}

type ManualNumberInputProps = {
  ariaLabel: string;
  value: number;
  onValueChange: (value: number) => void;
  step?: string;
  min?: string;
  max?: string;
  className: string;
};

function ManualNumberInput({
  ariaLabel,
  value,
  onValueChange,
  step,
  min,
  max,
  className,
}: ManualNumberInputProps) {
  const [display, setDisplay] = useState(toDisplay(value));
  const focusedRef = useRef(false);

  function clamp(next: number) {
    const lo = min != null ? parseFloat(min) : -Infinity;
    const hi = max != null ? parseFloat(max) : Infinity;
    return Math.min(hi, Math.max(lo, next));
  }

  useEffect(() => {
    if (!focusedRef.current) {
      setDisplay(toDisplay(value));
    }
  }, [value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextDisplay = event.target.value;
    setDisplay(nextDisplay);

    if (nextDisplay === "") return;

    const parsed = parseDecimal(nextDisplay);
    if (!Number.isNaN(parsed)) {
      onValueChange(clamp(parsed));
    }
  }

  function handleBlur() {
    focusedRef.current = false;

    const parsed = parseDecimal(display);
    if (!Number.isNaN(parsed)) {
      setDisplay(toDisplay(clamp(parsed)));
      return;
    }

    setDisplay(toDisplay(value));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      data-step={step}
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
  downPaymentPct: number;
  maxDividendIncomeRatioPct: number;
  loanAmountUF?: number;
  calculatedCaePct?: number;
  onChange: (patch: Partial<{
    selectedBankId: string;
    termYears: number;
    downPaymentPct: number;
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
  downPaymentPct,
  maxDividendIncomeRatioPct,
  loanAmountUF,
  calculatedCaePct,
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
  const bankMinPiePct = 100 - maxFinancingPct;
  const configuredPieOverridesBank = downPaymentPct > bankMinPiePct + 0.01;
  const termAvailable = selectedBank?.availableTermsYears.includes(termYears) ?? true;
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
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
      <div className="grid gap-4">
        <div className="min-w-0">
          <label htmlFor="bank-select" className="mb-1 block text-sm font-medium text-slate-700">
            Banco
          </label>
          <select
            id="bank-select"
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedBankId}
            onChange={(event) => handleBankChange(event.target.value)}
          >
            {sortedCaePresets.map(({ bank, term }) => (
              <option key={bank.bankId} value={bank.bankId}>
                {bank.bankName} · CAE {formatDecimal(term.caePct)}%
                {term.termYears !== termYears ? ` (${term.termYears} años)` : ""}
              </option>
            ))}
            <option value="manual">Otra tasa (ingresar a mano)</option>
          </select>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            {isManual
              ? "Ingresa la tasa y el seguro que te cotizó tu banco."
              : `Bancos ordenados del más barato al más caro según CAE (costo total del crédito). Pie mínimo: ${100 - maxFinancingPct}%.`}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Condiciones del crédito</p>
          <div className="grid grid-cols-2 gap-2">
          <Metric label="Tasa anual" tooltipTermId="tasa">
            {isManual ? (
              <ManualNumberInput
                step="0.01"
                min="0"
                max="30"
                ariaLabel="Tasa anual (%)"
                className={metricInputClass}
                value={annualRatePct}
                onValueChange={(value) => onChange({ annualRatePct: value })}
              />
            ) : (
              `${formatDecimal(annualRatePct)}%`
            )}
          </Metric>

          <Metric label={isManual ? "CAE estimada" : "CAE"} tooltipTermId="cae">
            {isManual
              ? calculatedCaePct != null
                ? `${formatDecimal(calculatedCaePct)}%`
                : "Completa el escenario"
              : `${formatDecimal(caePct)}%`}
          </Metric>

          <Metric label="Seguro mensual" tooltipTermId="seguro-desgravamen">
            {isManual ? (
              <ManualNumberInput
                step="0.01"
                min="0"
                ariaLabel="Seguro mensual (UF)"
                className={metricInputClass}
                value={monthlyInsuranceUF}
                onValueChange={(value) => onChange({ monthlyInsuranceUF: value })}
              />
            ) : (
              `${formatDecimal(monthlyInsuranceUF)} UF`
            )}
          </Metric>

          <Metric label="Financiamiento" tooltipTermId="financiamiento-maximo">
            {isManual ? (
              <ManualNumberInput
                step="1"
                min="50"
                max="100"
                ariaLabel="Financiamiento máximo (%)"
                className={metricInputClass}
                value={maxFinancingPct}
                onValueChange={(value) =>
                  onChange({ maxFinancingPct: value, downPaymentPct: Math.max(0, 100 - value) })
                }
              />
            ) : (
              `${maxFinancingPct}%`
            )}
          </Metric>

          {!isManual && selectedBank && !termAvailable && (
            <Metric label="Plazos con datos">
              <span className="truncate text-amber-800">{selectedBank.availableTermsYears.join(", ")} años</span>
            </Metric>
          )}
          </div>
          {configuredPieOverridesBank && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-4 text-amber-900">
              <span>
                Tu pie mínimo configurado ({formatDecimal(downPaymentPct, 0)}%) es mayor que el del banco ({formatDecimal(bankMinPiePct, 0)}%), así que se usa {formatDecimal(downPaymentPct, 0)}%.
              </span>
              <button
                type="button"
                onClick={() => onChange({ downPaymentPct: bankMinPiePct })}
                className="rounded-md border border-amber-300 bg-white px-2 py-0.5 font-semibold hover:bg-amber-100"
              >
                Usar {formatDecimal(bankMinPiePct, 0)}%
              </button>
            </div>
          )}
          {isManual && calculatedCaePct != null && loanAmountUF != null && (
            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              CAE estimada sobre un crédito de {formatUF(loanAmountUF, 0)} con seguro mensual fijo. Es referencial, no una CAE bancaria.
            </p>
          )}
        </div>
      </div>

      {!isManual && selectedBank && selectedTermPreset && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          {selectedTermPreset.termYears === termYears ? (
            <span>
              Tasas CMF {selectedTermPreset.termYears} años · {selectedTermPreset.lastUpdated}
            </span>
          ) : (
            <span>
              La CMF no publica {termYears} años para este banco; usamos la tasa a {selectedTermPreset.termYears} años
            </span>
          )}
          <a
            href={selectedTermPreset.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700"
          >
            Fuente
          </a>
          <span>Valores referenciales.</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 border-t border-slate-200/80 pt-4">
        <div>
          <label htmlFor="carga-slider" className="flex items-center text-xs font-medium text-slate-700">
            ¿Cuánto de tu sueldo puede ir al dividendo? <Tooltip termId="carga-financiera" />
          </label>
          <p className="mt-1 text-[11px] text-slate-500">Los bancos suelen exigir un máximo de 25%. Rango típico: 20%–30%.</p>
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
            id="carga-slider"
            type="range"
            min="15"
            max="40"
            step="1"
            className="relative z-10 w-full accent-blue-600"
            value={maxDividendIncomeRatioPct}
            onChange={(event) => onChange({ maxDividendIncomeRatioPct: parseInt(event.target.value, 10) })}
            aria-valuetext={`${maxDividendIncomeRatioPct}% del ingreso`}
          />
          <div className="relative mt-1 h-6 text-[11px] text-slate-500">
            <span
              className="absolute top-0 whitespace-nowrap rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700"
              style={{ left: `${sliderProgressPct}%`, transform: sliderValueLabelTransform }}
            >
              {maxDividendIncomeRatioPct}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>15%</span>
            <span>40%</span>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-sm" aria-hidden="true">◆</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-900">¿Quieres simular con FOGAES?</p>
            <p className="mt-1 text-[11px] leading-4 text-amber-900/85">
              Para viviendas nuevas de primera compra: usa “Otra tasa”, 90% de financiamiento (10% de pie) y la tasa que te cotice tu banco.
            </p>
            <button
              type="button"
              onClick={() => onChange({ selectedBankId: "manual", downPaymentPct: 10, maxFinancingPct: 90 })}
              className="mt-2 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Configurar escenario FOGAES
            </button>
            <p className="mt-2 text-[11px] leading-4 text-amber-900/80">
              Parámetros referenciales; el banco confirma la tasa y elegibilidad. <a href="https://fogaes.cl/sitio/requisitos/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-950">Ver requisitos</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

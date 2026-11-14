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
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

function Metric({ label, tooltipTermId, hint, className, children }: MetricProps) {
  return (
    <div className={`flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white px-3 py-2 ${className ?? ""}`}>
      <div className="flex items-center text-[11px] font-medium text-slate-500">
        {label}
        {tooltipTermId && <Tooltip termId={tooltipTermId} />}
      </div>
      <div className="mt-1 flex min-h-8 items-center text-sm font-semibold text-slate-900">
        <div className="w-full">{children}</div>
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
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
  loanAmountUF,
  calculatedCaePct,
  onChange,
}: Props) {
  const isManual = selectedBankId === "manual";
  const selectedPreset = resolveBankTermPreset(selectedBankId, termYears);
  const selectedBank = selectedPreset?.bank;
  const selectedTermPreset = selectedPreset?.term;
  const sortedCaePresets = getBankPresetsSortedByCaeForTerm(termYears);
  const bankMinPiePct = 100 - maxFinancingPct;
  const termAvailable = selectedBank?.availableTermsYears.includes(termYears) ?? true;

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

  const tileInputClass =
    "h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 md:w-80 md:shrink-0">
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
        </div>
        <p className="text-xs leading-5 text-slate-500 md:pb-2">
          {isManual
            ? "Escribe la tasa, el seguro y el financiamiento que te cotizó tu banco."
            : "Ordenados del más barato al más caro según CAE (costo total del crédito). Elige “Otra tasa” para ingresar una cotización."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Tasa anual" tooltipTermId="tasa">
          {isManual ? (
            <ManualNumberInput
              min="0"
              max="30"
              ariaLabel="Tasa anual (%)"
              className={tileInputClass}
              value={annualRatePct}
              onValueChange={(value) => onChange({ annualRatePct: value })}
            />
          ) : (
            `${formatDecimal(annualRatePct)}%`
          )}
        </Metric>

        <Metric label={isManual ? "CAE estimada" : "CAE"} tooltipTermId="cae">
          {isManual ? (calculatedCaePct != null ? `${formatDecimal(calculatedCaePct)}%` : "—") : `${formatDecimal(caePct)}%`}
        </Metric>

        <Metric label="Seguro mensual" tooltipTermId="seguro-desgravamen">
          {isManual ? (
            <ManualNumberInput
              min="0"
              ariaLabel="Seguro mensual (UF)"
              className={tileInputClass}
              value={monthlyInsuranceUF}
              onValueChange={(value) => onChange({ monthlyInsuranceUF: value })}
            />
          ) : (
            `${formatDecimal(monthlyInsuranceUF)} UF`
          )}
        </Metric>

        <Metric label="Financiamiento" tooltipTermId="financiamiento-maximo" hint={`Pie mínimo ${bankMinPiePct}%`}>
          {isManual ? (
            <ManualNumberInput
              min="50"
              max="100"
              ariaLabel="Financiamiento máximo (%)"
              className={tileInputClass}
              value={maxFinancingPct}
              onValueChange={(value) => onChange({ maxFinancingPct: value })}
            />
          ) : (
            `${maxFinancingPct}%`
          )}
        </Metric>

        <Metric label="Dividendo máx." tooltipTermId="carga-financiera" className="col-span-2 sm:col-span-1" hint="Bancos: 25% (rango 20–30%)">
          <div className="flex items-center gap-2">
            <input
              id="carga-slider"
              type="range"
              min="15"
              max="40"
              step="1"
              className="min-w-0 flex-1 accent-blue-600"
              value={maxDividendIncomeRatioPct}
              onChange={(event) => onChange({ maxDividendIncomeRatioPct: parseInt(event.target.value, 10) })}
              aria-label="Porcentaje máximo del sueldo que puede ir al dividendo"
              aria-valuetext={`${maxDividendIncomeRatioPct}% del sueldo`}
            />
            <span className="w-9 shrink-0 text-right">{maxDividendIncomeRatioPct}%</span>
          </div>
        </Metric>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[11px] leading-4 text-slate-500">
          {isManual ? (
            loanAmountUF != null && calculatedCaePct != null ? (
              <>CAE estimada sobre un crédito de {formatUF(loanAmountUF, 0)} con seguro fijo. Referencial, no es una CAE bancaria.</>
            ) : (
              <>La CAE se estima cuando completes tu escenario.</>
            )
          ) : selectedTermPreset ? (
            <>
              {selectedTermPreset.termYears === termYears
                ? `Tasas CMF a ${selectedTermPreset.termYears} años · ${selectedTermPreset.lastUpdated}.`
                : `La CMF no publica ${termYears} años para este banco; usamos la tasa a ${selectedTermPreset.termYears} años${
                    selectedBank && !termAvailable ? ` (disponible: ${selectedBank.availableTermsYears.join(", ")} años)` : ""
                  }.`}{" "}
              <a href={selectedTermPreset.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
                Fuente
              </a>
              . Valores referenciales.
            </>
          ) : null}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900 lg:shrink-0">
          <span>
            <span className="font-semibold">¿Primera vivienda nueva?</span> Con FOGAES financias hasta 90%.
          </span>
          <button
            type="button"
            onClick={() => onChange({ selectedBankId: "manual", downPaymentPct: 10, maxFinancingPct: 90 })}
            className="rounded-md border border-amber-300 bg-white px-2 py-1 font-semibold transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Simular FOGAES
          </button>
          <a href="https://fogaes.cl/sitio/requisitos/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-950">
            Requisitos
          </a>
        </div>
      </div>
    </section>
  );
}

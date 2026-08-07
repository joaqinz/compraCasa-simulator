import { getBankPresetsSortedByCaeForTerm, resolveBankTermPreset } from "@/lib/bankPresets";
import { Tooltip } from "./ui/Tooltip";
import { useEffect, useRef, useState } from "react";

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Banco / Escenario</label>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedBankId}
          onChange={(event) => handleBankChange(event.target.value)}
        >
          {sortedCaePresets.map(({ bank, term }) => (
            <option key={bank.bankId} value={bank.bankId}>
              {bank.bankName} - CAE {term.caePct.toFixed(2)}%
              {term.termYears !== termYears ? ` (${term.termYears} años)` : ""}
            </option>
          ))}
          <option value="manual">Ingreso manual</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="flex items-center text-xs font-medium text-slate-600">
            Tasa anual <Tooltip termId="tasa" />
          </label>
          {isManual ? (
            <ManualNumberInput
              step="0.01"
              min="0"
              max="30"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={annualRatePct}
              onValueChange={(value) => onChange({ annualRatePct: value })}
            />
          ) : (
            <p className="py-1.5 text-sm font-semibold text-slate-800">{annualRatePct}%</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-center text-xs font-medium text-slate-600">
            CAE <Tooltip termId="cae" />
          </label>
          {isManual ? (
            <ManualNumberInput
              step="0.01"
              min="0"
              max="30"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={caePct}
              onValueChange={(value) => onChange({ caePct: value })}
            />
          ) : (
            <p className="py-1.5 text-sm font-semibold text-slate-800">{caePct}%</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-center text-xs font-medium text-slate-600">
            Seguro mensual (UF) <Tooltip termId="seguro-desgravamen" />
          </label>
          {isManual ? (
            <ManualNumberInput
              step="0.01"
              min="0"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={monthlyInsuranceUF}
              onValueChange={(value) => onChange({ monthlyInsuranceUF: value })}
            />
          ) : (
            <p className="py-1.5 text-sm font-semibold text-slate-800">{monthlyInsuranceUF} UF</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Plazos</label>
          <p className="py-1.5 text-sm font-semibold text-slate-800">
            {selectedBank?.availableTermsYears.join(", ") ?? "15, 20, 25, 30"} años
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
          Financiamiento máximo <Tooltip termId="financiamiento-maximo" />
        </div>
        {isManual ? (
          <ManualNumberInput
            step="1"
            min="50"
            max="100"
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={maxFinancingPct}
            onValueChange={(value) => onChange({ maxFinancingPct: value })}
          />
        ) : (
          <p className="mt-1 text-lg font-bold text-slate-900">{maxFinancingPct}%</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          El banco financia hasta el {maxFinancingPct}% del valor de la propiedad. El resto debe salir de tu pie.
        </p>
      </div>

      {!isManual && selectedBank && selectedTermPreset && (
        <div className="flex flex-col gap-1 text-[10px] text-slate-400">
          {selectedTermPreset.termYears === termYears ? (
            <p>
              Tasas CMF para {selectedTermPreset.termYears} años: {selectedTermPreset.lastUpdated}. Fuente:{" "}
              <a
                href={selectedTermPreset.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-600"
              >
                CMF Simulador Hipotecario
              </a>
              . Valores referenciales.
            </p>
          ) : (
            <p>
              No hay escenario CMF para {termYears} años en este banco. Se muestra como referencia el disponible más
              cercano: {selectedTermPreset.termYears} años.
            </p>
          )}
          <p>
            Escenarios disponibles para este banco: {selectedBank.availableTermsYears.join(", ")} años.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="flex items-center text-xs font-medium text-slate-600">
          Carga financiera máxima <Tooltip termId="carga-financiera" />
        </label>
        <p className="text-[11px] text-slate-500">
          Los bancos suelen exigir ≤25%. Subirlo asume que tu banco lo permite.
        </p>
        <div className="relative rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-slate-800">Actual: {maxDividendIncomeRatioPct}% del ingreso neto</span>
            <span className="text-slate-400">Rango típico: 20%-30%</span>
          </div>
          <div
            className="pointer-events-none absolute left-3 right-3 top-[44px] h-2 rounded-full bg-slate-100"
            aria-hidden="true"
          >
            <div
              className="absolute h-full rounded-full bg-emerald-100"
              style={{
                left: `${typicalStartPct}%`,
                width: `${typicalEndPct - typicalStartPct}%`,
              }}
            />
            <div
              className="absolute h-full rounded-full bg-blue-200/70"
              style={{ width: `${sliderProgressPct}%` }}
            />
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
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>15%</span>
            <span>40%</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Rango típico sombreado: 20% a 30% del ingreso neto.</p>
        </div>
      </div>
    </div>
  );
}

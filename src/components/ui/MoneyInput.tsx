import { useEffect, useId, useRef, useState } from "react";
import type { MoneyUnit } from "@/types/finance";
import { Tooltip } from "./Tooltip";

type Props = {
  label: string;
  value: number | undefined;
  unit: MoneyUnit;
  onValueChange: (value: number | undefined) => void;
  onUnitChange: (unit: MoneyUnit) => void;
  placeholder?: string;
  tooltipTermId?: string;
  min?: number;
  disabled?: boolean;
};

function formatDisplay(value: number, unit: MoneyUnit): string {
  if (unit === "UF") {
    return value.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  }

  return Math.round(value).toLocaleString("es-CL");
}

function parseDisplay(raw: string): number | undefined {
  if (!raw) return undefined;

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(normalized);

  return Number.isNaN(value) ? undefined : value;
}

export function MoneyInput({
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  placeholder,
  tooltipTermId,
  min = 0,
  disabled = false,
}: Props) {
  const [display, setDisplay] = useState(value != null ? formatDisplay(value, unit) : "");
  const focusedRef = useRef(false);
  const inputId = useId();

  useEffect(() => {
    if (!focusedRef.current) {
      setDisplay(value != null ? formatDisplay(value, unit) : "");
    }
  }, [unit, value]);

  function handleFocus() {
    focusedRef.current = true;
    const parsed = parseDisplay(display);

    if (parsed != null) {
      setDisplay(unit === "UF" ? String(parsed) : String(Math.round(parsed)));
    }
  }

  function handleBlur() {
    focusedRef.current = false;
    const parsed = parseDisplay(display);

    if (parsed != null && parsed >= min) {
      setDisplay(formatDisplay(parsed, unit));
      return;
    }

    setDisplay("");
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    let nextValue = event.target.value;

    if (unit === "CLP") {
      nextValue = nextValue.replace(/[^\d]/g, "");
    } else {
      nextValue = nextValue.replace(/[^\d.,]/g, "");
    }

    setDisplay(nextValue);

    const parsed = parseDisplay(nextValue);
    onValueChange(parsed != null && parsed >= min ? parsed : undefined);
  }

  function handleUnitChange(nextUnit: MoneyUnit) {
    onUnitChange(nextUnit);

    const parsed = parseDisplay(display);
    if (parsed != null) {
      setDisplay(focusedRef.current ? String(parsed) : formatDisplay(parsed, nextUnit));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="flex items-center text-sm font-medium text-slate-700">
        {label}
        {tooltipTermId && <Tooltip termId={tooltipTermId} />}
      </label>
      <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
        <input
          id={inputId}
          type="text"
          inputMode={unit === "CLP" ? "numeric" : "decimal"}
          className="min-w-0 flex-1 bg-white px-3 py-2 text-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
          value={display}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder ?? (unit === "CLP" ? "ej. 2.500.000" : "ej. 3.500")}
          disabled={disabled}
        />
        <select
          aria-label={`Unidad de ${label}`}
          className="cursor-pointer border-l border-slate-300 bg-slate-50 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          value={unit}
          onChange={(event) => handleUnitChange(event.target.value as MoneyUnit)}
          disabled={disabled}
        >
          <option value="CLP">CLP</option>
          <option value="UF">UF</option>
        </select>
      </div>
    </div>
  );
}

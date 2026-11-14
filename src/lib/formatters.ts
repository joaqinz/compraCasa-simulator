import type { DisplayUnit } from "@/types/finance";

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const ufFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ufLargeFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatUF(valueUF: number, decimals: 0 | 2 = 2): string {
  const fmt = decimals === 0 ? ufLargeFormatter : ufFormatter;
  return `${fmt.format(valueUF)} UF`;
}

export function formatCLP(valueCLP: number): string {
  return clpFormatter.format(Math.round(valueCLP));
}

export function formatBoth(valueUF: number, ufValueCLP: number): string {
  return `${formatUF(valueUF)} / ${formatCLP(valueUF * ufValueCLP)}`;
}

export function formatPct(value: number): string {
  return `${value}%`;
}

export function formatDisplayValue(
  valueUF: number,
  ufValueCLP: number,
  unit: DisplayUnit
): string {
  if (unit === "UF") return formatUF(valueUF);
  if (unit === "CLP") return formatCLP(valueUF * ufValueCLP);
  return formatBoth(valueUF, ufValueCLP);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CL").format(value);
}

const decimalFormatters = new Map<number, Intl.NumberFormat>();

/** Chilean decimal format (comma), e.g. 3,30 */
export function formatDecimal(value: number, decimals = 2): string {
  let fmt = decimalFormatters.get(decimals);
  if (!fmt) {
    fmt = new Intl.NumberFormat("es-CL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    decimalFormatters.set(decimals, fmt);
  }
  return fmt.format(value);
}

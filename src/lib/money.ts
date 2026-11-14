import type { MoneyUnit } from "@/types/finance";

export function toUF(amount: number, unit: MoneyUnit, ufValueCLP: number): number {
  if (unit === "UF") return amount;
  return amount / ufValueCLP;
}

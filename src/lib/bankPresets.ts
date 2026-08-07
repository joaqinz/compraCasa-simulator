import bankPresetsRaw from "@/data/bankPresets.json";
import type { BankPreset, BankTermPreset } from "@/types/finance";

export const bankPresets = bankPresetsRaw as BankPreset[];
export const firstBankPreset = bankPresets.find((preset) => preset.bankId !== "manual") ?? bankPresets[0];

export const presetTermYears = Array.from(
  new Set(
    bankPresets
      .filter((preset) => preset.bankId !== "manual")
      .flatMap((preset) => preset.availableTermsYears)
  )
).sort((a, b) => a - b);

export function getBankPreset(bankId: string): BankPreset | undefined {
  return bankPresets.find((preset) => preset.bankId === bankId);
}

export function getPresetTermYears(bankId: string): number[] {
  return getBankPreset(bankId)?.availableTermsYears ?? presetTermYears;
}

export function resolveBankTermPreset(
  bankId: string,
  termYears: number
): { bank: BankPreset; term: BankTermPreset } | undefined {
  const bank = getBankPreset(bankId);
  if (!bank || bank.termPresets.length === 0) return undefined;

  const exactTerm = bank.termPresets.find((preset) => preset.termYears === termYears);
  if (exactTerm) {
    return { bank, term: exactTerm };
  }

  const sortedTerms = [...bank.termPresets].sort(
    (a, b) => Math.abs(a.termYears - termYears) - Math.abs(b.termYears - termYears) || a.termYears - b.termYears
  );

  return { bank, term: sortedTerms[0] };
}

export function findLowestCaePresetForTerm(
  termYears: number
): { bank: BankPreset; term: BankTermPreset } | undefined {
  return bankPresets
    .filter((preset) => preset.bankId !== "manual")
    .map((preset) => resolveBankTermPreset(preset.bankId, termYears))
    .filter((preset): preset is { bank: BankPreset; term: BankTermPreset } => Boolean(preset))
    .sort((a, b) =>
      a.term.caePct - b.term.caePct ||
      a.term.annualRatePct - b.term.annualRatePct ||
      a.bank.bankName.localeCompare(b.bank.bankName)
    )[0];
}

export function getBankPresetsSortedByCaeForTerm(
  termYears: number
): Array<{ bank: BankPreset; term: BankTermPreset }> {
  return bankPresets
    .filter((preset) => preset.bankId !== "manual")
    .map((preset) => resolveBankTermPreset(preset.bankId, termYears))
    .filter((preset): preset is { bank: BankPreset; term: BankTermPreset } => Boolean(preset))
    .sort((a, b) =>
      a.term.caePct - b.term.caePct ||
      a.term.annualRatePct - b.term.annualRatePct ||
      a.bank.bankName.localeCompare(b.bank.bankName)
    );
}

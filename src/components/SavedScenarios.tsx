import { useEffect, useState } from "react";
import type { ScenarioInput, ScenarioOutput } from "@/types/finance";
import { getBankPreset } from "@/lib/bankPresets";
import { formatCLP, formatDecimal, formatUF } from "@/lib/formatters";

const STORAGE_KEY = "compracasa-saved-scenarios-v1";
const MAX_SAVED = 3;

type SavedInput = Omit<ScenarioInput, "ufValueCLP">;

type SavedScenario = {
  id: string;
  name: string;
  input: SavedInput;
  propertyUF: number;
  dividendUF: number;
  pieUF: number;
  loanUF: number;
};

type Props = {
  input: ScenarioInput;
  output: ScenarioOutput;
  onLoad: (input: SavedInput) => void;
};

function readSaved(): SavedScenario[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED) : [];
  } catch {
    return [];
  }
}

function writeSaved(list: SavedScenario[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable (private mode, blocked): comparison still works for this visit.
  }
}

function bankName(input: SavedInput) {
  return input.selectedBankId === "manual" ? "Otra tasa" : getBankPreset(input.selectedBankId)?.bankName ?? "Banco";
}

export function SavedScenarios({ input, output, onLoad }: Props) {
  const [saved, setSaved] = useState<SavedScenario[]>(() => readSaved());

  useEffect(() => writeSaved(saved), [saved]);

  const propertyUF = input.mode === "target_property" ? output.propertyPriceUF : output.realisticMaxPropertyUF;
  const canSave =
    propertyUF != null && output.fullMonthlyDividendUF != null && output.downPaymentUF != null && output.loanAmountUF != null;
  const uf = input.ufValueCLP;

  function handleSave() {
    if (!canSave) return;
    const { ufValueCLP: _ignored, ...rest } = input;
    void _ignored;
    const entry: SavedScenario = {
      id: `${Date.now()}`,
      name: `${bankName(rest)} · ${input.termYears} años`,
      input: rest,
      propertyUF: propertyUF ?? 0,
      dividendUF: output.fullMonthlyDividendUF ?? 0,
      pieUF: output.downPaymentUF ?? 0,
      loanUF: output.loanAmountUF ?? 0,
    };
    setSaved((list) => [entry, ...list].slice(0, MAX_SAVED));
  }

  return (
    <section className="surface-card rounded-2xl p-5" aria-labelledby="saved-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="saved-title" className="text-sm font-semibold text-slate-900">
            Compara escenarios
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Guarda hasta {MAX_SAVED} combinaciones (banco, plazo, tasa) y compáralas lado a lado. Se guardan solo en este
            navegador.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Guardar escenario actual
        </button>
      </div>

      {saved.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Escenario</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Propiedad</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Dividendo</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Pie</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Total pagado</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {saved.map((item) => {
                const totalPaidUF = item.dividendUF * item.input.termYears * 12;
                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Tasa {formatDecimal(item.input.annualRatePct)}% ·{" "}
                        {item.input.mode === "income" ? "máximo por ingreso" : "precio objetivo"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="font-semibold text-slate-900">{formatUF(item.propertyUF, 0)}</div>
                      <div className="text-[11px] text-slate-500">{formatCLP(item.propertyUF * uf)}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div>{formatUF(item.dividendUF, 2)}</div>
                      <div className="text-[11px] text-slate-500">{formatCLP(item.dividendUF * uf)}</div>
                    </td>
                    <td className="px-3 py-2 text-right">{formatUF(item.pieUF, 0)}</td>
                    <td className="px-3 py-2 text-right">
                      <div>{formatUF(totalPaidUF, 0)}</div>
                      <div className="text-[11px] text-slate-500">en {item.input.termYears} años</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onLoad(item.input)}
                        className="rounded-md px-2 py-1 font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Cargar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaved((list) => list.filter((entry) => entry.id !== item.id))}
                        className="rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100"
                        aria-label={`Quitar ${item.name}`}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

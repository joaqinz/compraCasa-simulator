import { useMemo, useState } from "react";
import type { UFMetadata } from "@/types/finance";

type Props = {
  metadata: UFMetadata | null;
  loading: boolean;
  error: boolean;
  onManualOverride: (value: number) => void;
};

function parseMetadataDate(dateString: string | undefined) {
  if (!dateString) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(`${dateString}T00:00:00`);
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return null;
}

function formatChileanDate(dateString: string | undefined) {
  const parsed = parseMetadataDate(dateString);
  if (!parsed) return dateString ?? "";
  return parsed.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function UFStatusBar({ metadata, loading, error, onManualOverride }: Props) {
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseFloat(manualInput.replace(",", "."));
    if (!Number.isNaN(value) && value > 0) {
      onManualOverride(value);
      setShowManual(false);
    }
  }

  const ufFormatted = metadata?.valueCLP
    ? new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(metadata.valueCLP)
    : null;

  const freshness = useMemo(() => {
    const parsedDate = parseMetadataDate(metadata?.date);
    if (!parsedDate) return { stale: metadata?.source === "Fallback", daysOld: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - parsedDate.getTime();
    const daysOld = Math.max(0, Math.round(diffMs / 86400000));
    return { stale: daysOld > 1 || metadata?.source === "Fallback", daysOld };
  }, [metadata]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-slate-800 px-4 py-2 text-xs text-slate-200">
      {loading && (
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />
          Obteniendo valor UF...
        </span>
      )}

      {!loading && metadata && !error && (
        <span className="flex items-center gap-1">
          <span className={freshness.stale ? "text-amber-400" : "text-emerald-400"}>●</span>
          UF {freshness.daysOld === 0 ? "hoy" : "del"} ({formatChileanDate(metadata.date)}): <strong className="ml-1 text-white">${ufFormatted}</strong>
          <span className="ml-1 text-slate-300">
            (Fuente:{" "}
            {metadata.source === "SII"
              ? "SII"
              : metadata.source === "Mindicador"
                ? "mindicador.cl"
                : metadata.source === "Manual"
                  ? "Manual"
                  : "Valor de respaldo"}
            )
          </span>
          {freshness.stale && (
            <span className="ml-1 text-amber-300">
              podría estar desactualizado
            </span>
          )}
        </span>
      )}

      {!loading && (error || metadata?.source === "Fallback") && (
        <span className="flex items-center gap-1 text-amber-300">No se pudo obtener la UF automáticamente.</span>
      )}

      {!showManual ? (
        <button
          type="button"
          className="text-slate-300 underline hover:text-white"
          onClick={() => setShowManual(true)}
        >
          {metadata?.source === "Manual" ? "Cambiar UF" : "Ingresar UF manualmente"}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            aria-label="Valor UF en pesos"
            className="w-28 rounded border border-slate-500 bg-slate-700 px-2 py-1 text-xs text-white focus:border-blue-400 focus:outline-none"
            placeholder="ej. 40160,14"
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            autoFocus
          />
          <button type="submit" className="text-xs text-blue-400 hover:text-blue-300">
            Aplicar
          </button>
          <button type="button" className="text-xs text-slate-300 hover:text-white" onClick={() => setShowManual(false)}>
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}

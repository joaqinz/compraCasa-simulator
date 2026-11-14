import type { UFMetadata } from "@/types/finance";

const UF_SOURCES: Record<UFMetadata["source"], { label: string; href?: string }> = {
  SII: { label: "SII", href: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm" },
  Mindicador: { label: "mindicador.cl", href: "https://mindicador.cl" },
  Manual: { label: "ingresado por ti" },
  Fallback: { label: "valor de respaldo (no se pudo obtener el actual)" },
};

export function DisclaimerSection({ ufSource }: { ufSource?: UFMetadata["source"] }) {
  const source = UF_SOURCES[ufSource ?? "Fallback"];
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 leading-relaxed">
      <p className="font-semibold text-slate-700 mb-2">Aviso importante</p>
      <p>
        Este simulador es educativo y referencial. No representa una oferta formal de crédito, aprobación bancaria, ni asesoría financiera.
        La aprobación real depende de la política comercial de cada banco, evaluación de riesgo, verificación de ingresos, nivel de deuda,
        características de la propiedad, seguros, gastos operacionales y condiciones actuales del mercado.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
        <span>
          Tasas de referencia:{" "}
          <a
            href="https://servicios.cmfchile.cl/simuladorhipotecario/aplicacion?indice=101.2.1"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            CMF Simulador Hipotecario
          </a>
        </span>
        <span>
          Valor UF:{" "}
          {source.href ? (
            <a href={source.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
              {source.label}
            </a>
          ) : (
            source.label
          )}
        </span>
      </div>
    </div>
  );
}

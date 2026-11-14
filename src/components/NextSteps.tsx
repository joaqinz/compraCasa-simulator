import { useState } from "react";

const STEPS = [
  {
    title: "Pide pre-aprobación en 2 o 3 bancos",
    body: "Te dicen cuánto te prestan de verdad y a qué tasa. No compromete tu compra.",
  },
  {
    title: "Ten tus documentos listos",
    body: "Últimas 3 liquidaciones de sueldo, cotizaciones AFP de los últimos 12 meses y carpeta tributaria (si eres independiente, las últimas 2 declaraciones de renta).",
  },
  {
    title: "Compara por CAE, no solo por tasa",
    body: "La CAE incluye seguros y gastos; es la forma justa de comparar ofertas entre bancos.",
  },
  {
    title: "Guarda plata para el cierre",
    body: "Además del pie necesitas pagar tasación, estudio de títulos, notaría, Conservador e impuesto al mutuo.",
  },
  {
    title: "Revisa si calificas para FOGAES o subsidios",
    body: "Si es tu primera vivienda y es nueva, podrías financiar hasta 90% o bajar tu tasa.",
  },
];

export function NextSteps() {
  const [open, setOpen] = useState(false);

  return (
    <section className="surface-card overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="next-steps-panel"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      >
        <span>Próximos pasos con el banco</span>
        <span className="text-xs text-blue-700">{open ? "Ocultar" : "Ver checklist"}</span>
      </button>
      {open && (
        <ol id="next-steps-panel" className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-900">{step.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

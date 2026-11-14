import { useState } from "react";
import glossary from "@/data/financialGlossary.json";

export function GlossarySection() {
  const [open, setOpen] = useState(false);
  const [openTerms, setOpenTerms] = useState<Set<string>>(new Set());

  function toggleTerm(id: string) {
    setOpenTerms((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
        aria-expanded={open}
        aria-controls="financial-glossary-panel"
      >
        <span>Glosario de términos financieros</span>
        <span className="text-xs text-slate-500">{open ? "Ocultar" : "Ver términos"}</span>
      </button>

      {open && (
        <div id="financial-glossary-panel" className="divide-y divide-slate-100 bg-white">
          {glossary.map((term) => {
            const isOpen = openTerms.has(term.id);

            return (
              <div key={term.id}>
                <button
                  type="button"
                  onClick={() => toggleTerm(term.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
                  aria-expanded={isOpen}
                  aria-controls={`glossary-term-${term.id}`}
                >
                  <span className="font-medium text-slate-700">{term.term}</span>
                  <span className="ml-2 text-xs text-slate-500">{isOpen ? "Ocultar" : "Ver"}</span>
                </button>
                {isOpen && (
                  <p
                    id={`glossary-term-${term.id}`}
                    className="px-4 pb-3 text-xs leading-relaxed text-slate-600"
                  >
                    {term.definition}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

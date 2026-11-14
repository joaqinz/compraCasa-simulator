import { useLayoutEffect, useRef, useState } from "react";
import glossary from "@/data/financialGlossary.json";

type Props = { termId: string };

export function Tooltip({ termId }: Props) {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Keep the bubble inside the viewport (it is centred on a small icon near screen edges).
  useLayoutEffect(() => {
    if (!open || !panelRef.current) {
      setShiftX(0);
      return;
    }
    const rect = panelRef.current.getBoundingClientRect();
    const margin = 12;
    if (rect.left < margin) setShiftX(margin - rect.left);
    else if (rect.right > window.innerWidth - margin) setShiftX(window.innerWidth - margin - rect.right);
  }, [open]);

  const entry = glossary.find((g) => g.id === termId);
  if (!entry) return null;

  const panelId = `tooltip-${termId}`;

  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        type="button"
        className="-m-2 inline-flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        aria-label={`Información sobre ${entry.term}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold leading-none text-slate-700 hover:bg-slate-300">
          ?
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${shiftX}px))` }}
          className="absolute z-50 bottom-full left-1/2 mb-2 w-64 max-w-[calc(100vw-24px)] rounded-lg border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-lg whitespace-normal"
        >
          <p className="mb-1 font-semibold text-slate-900">{entry.term}</p>
          <p>{entry.definition}</p>
        </div>
      )}
    </span>
  );
}

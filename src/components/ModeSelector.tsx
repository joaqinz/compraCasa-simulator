import { useRef } from "react";
import type { ScenarioMode } from "@/types/finance";
import clsx from "clsx";

type Props = {
  mode: ScenarioMode;
  onChange: (mode: ScenarioMode) => void;
};

const modes: { id: ScenarioMode; title: string; subtitle: string; badge: string }[] = [
  {
    id: "income",
    title: "Sé cuánto gano",
    subtitle: "¿Qué propiedad puedo pagar con mi ingreso?",
    badge: "Ingreso",
  },
  {
    id: "target_property",
    title: "Sé el precio que quiero",
    subtitle: "¿Cuánto necesito ganar o ahorrar para esto?",
    badge: "Objetivo",
  },
];

export function ModeSelector({ mode, onChange }: Props) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + modes.length) % modes.length;
    buttonRefs.current[nextIndex]?.focus();
    onChange(modes[nextIndex].id);
  }

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-50/65">¿Qué sabes hoy?</p>
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-white/15 bg-black/10 p-2 sm:grid-cols-2" role="tablist" aria-label="Modo del simulador">
        {modes.map((entry, index) => (
          <button
            key={entry.id}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={mode === entry.id}
            onClick={() => onChange(entry.id)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={clsx(
              "rounded-xl border-2 px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-400",
              mode === entry.id
                ? "border-amber-200 bg-white shadow-lg shadow-black/10"
                : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
            )}
          >
            <span className={clsx(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
              mode === entry.id ? "bg-amber-100 text-amber-800" : "bg-white/10 text-cyan-50/70"
            )}>
              {entry.badge}
            </span>
            <p className={clsx("mt-2 text-sm font-semibold", mode === entry.id ? "text-slate-900" : "text-white")}>
              {entry.title}
            </p>
            <p className={clsx("mt-0.5 text-xs leading-tight", mode === entry.id ? "text-slate-500" : "text-cyan-50/65")}>{entry.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

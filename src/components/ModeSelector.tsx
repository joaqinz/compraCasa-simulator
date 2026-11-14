import { useRef } from "react";
import type { ScenarioMode } from "@/types/finance";
import clsx from "clsx";

type Props = {
  mode: ScenarioMode;
  onChange: (mode: ScenarioMode) => void;
};

const modes: { id: ScenarioMode; title: string; subtitle: string }[] = [
  {
    id: "income",
    title: "Sé cuánto gano",
    subtitle: "¿Qué propiedad puedo pagar?",
  },
  {
    id: "target_property",
    title: "Sé el precio que quiero",
    subtitle: "¿Cuánto necesito ganar o ahorrar?",
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
    <div
      className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/15 bg-black/10 p-1.5"
      role="tablist"
      aria-label="¿Qué sabes hoy?"
    >
      {modes.map((entry, index) => (
        <button
          key={entry.id}
          ref={(element) => {
            buttonRefs.current[index] = element;
          }}
          type="button"
          role="tab"
          aria-selected={mode === entry.id}
          tabIndex={mode === entry.id ? 0 : -1}
          onClick={() => onChange(entry.id)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className={clsx(
            "rounded-lg px-3 py-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-400",
            mode === entry.id ? "bg-white shadow-md shadow-black/10" : "hover:bg-white/10"
          )}
        >
          <span className={clsx("block text-sm font-semibold", mode === entry.id ? "text-slate-900" : "text-white")}>
            {entry.title}
          </span>
          <span
            className={clsx(
              "mt-0.5 hidden text-xs leading-tight sm:block",
              mode === entry.id ? "text-slate-500" : "text-cyan-50/65"
            )}
          >
            {entry.subtitle}
          </span>
        </button>
      ))}
    </div>
  );
}

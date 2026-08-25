import type { AffordabilityStatus } from "@/types/finance";
import clsx from "clsx";

type Props = { status: AffordabilityStatus; large?: boolean };

const config = {
  green: {
    label: "Alcanzable",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-300",
    icon: "OK",
  },
  yellow: {
    label: "Justo",
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
    icon: "!",
  },
  red: {
    label: "Fuera de rango",
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    icon: "X",
  },
  neutral: {
    label: "Referencia",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    icon: "–",
  },
} as const;

export function StatusBadge({ status, large = false }: Props) {
  const current = config[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        current.bg,
        current.text,
        current.border,
        large ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs"
      )}
    >
      <span className="font-bold">{current.icon}</span>
      {current.label}
    </span>
  );
}

import { useEffect, useState } from "react";
import { formatCLP, formatUF } from "@/lib/formatters";

type Props = {
  label: string;
  valueUF?: number;
  ufValueCLP: number;
};

/** Phone-only bar that keeps the answer visible while the user edits inputs above it. */
export function MobileResultBar({ label, valueUF, ufValueCLP }: Props) {
  const [resultVisible, setResultVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("resultado");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setResultVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [valueUF]);

  if (valueUF == null || valueUF <= 0 || resultVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {formatUF(valueUF, 0)} · {formatCLP(valueUF * ufValueCLP)}
          </p>
        </div>
        <a
          href="#resultado"
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Ver resultado ↓
        </a>
      </div>
    </div>
  );
}

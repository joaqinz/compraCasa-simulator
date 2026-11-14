import { useMemo, useState } from "react";
import type { ScenarioOutput, ScenarioInput, AffordabilityStatus } from "@/types/finance";
import { StatusBadge } from "./ui/StatusBadge";
import { Tooltip } from "./ui/Tooltip";
import { AFFORDABILITY_TOLERANCE_UF } from "@/lib/affordability";
import { formatCLP, formatUF } from "@/lib/formatters";
import clsx from "clsx";

type Props = {
  output: ScenarioOutput;
  input: ScenarioInput;
  status: AffordabilityStatus;
};

type CardProps = {
  title: string;
  value: string;
  sub?: string;
  tooltipId?: string;
  highlight?: "positive" | "negative" | "neutral";
  children?: React.ReactNode;
};

type ConstraintInsight = {
  label: string;
  title: string;
  body: string;
  action: string;
};

function Card({ title, value, sub, tooltipId, highlight, children }: CardProps) {
  return (
    <div
      className={clsx(
        "surface-card rounded-2xl p-5",
        highlight === "positive"
          ? "border-emerald-200"
          : highlight === "negative"
            ? "border-red-200"
            : "border-slate-200"
      )}
    >
      <p className="flex items-center text-xs font-medium text-slate-500">
        {title}
        {tooltipId && <Tooltip termId={tooltipId} />}
      </p>
      <p
        className={clsx(
          "mt-1 text-base font-bold",
          highlight === "positive"
            ? "text-emerald-700"
            : highlight === "negative"
              ? "text-red-700"
              : "text-slate-900"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      {children}
    </div>
  );
}

function formatPair(valueUF: number, ufValueCLP: number, decimals: 0 | 2 = 0) {
  return `${formatUF(valueUF, decimals)} · ${formatCLP(valueUF * ufValueCLP)}`;
}

const pctFormatter = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });

function formatPctValue(value: number) {
  return `${pctFormatter.format(value)}%`;
}

function getIncomeUF(input: ScenarioInput) {
  if (input.netMonthlyIncomeAmount == null) return undefined;
  return input.netMonthlyIncomeUnit === "CLP"
    ? input.netMonthlyIncomeAmount / input.ufValueCLP
    : input.netMonthlyIncomeAmount;
}

function getSavingsUF(input: ScenarioInput) {
  if (input.savingsAmount == null) return input.mode === "income" ? 0 : undefined;
  return input.savingsUnit === "CLP" ? input.savingsAmount / input.ufValueCLP : input.savingsAmount;
}

function getConstraintInsight(output: ScenarioOutput, input: ScenarioInput): ConstraintInsight | null {
  const byIncome = output.maxPropertyByIncomeUF;
  const bySavings = output.maxPropertyBySavingsUF;
  const incomeGap = output.incomeGapUF ?? 0;
  const savingsGap = output.savingsGapUF ?? 0;
  const isBalanced =
    byIncome != null &&
    bySavings != null &&
    Math.abs(byIncome - bySavings) <= Math.max(25, Math.min(byIncome, bySavings) * 0.01);

  if (input.mode === "income") {
    const maxLoan = output.maxLoanByIncomeUF;
    const savingsUF = getSavingsUF(input);

    if ((savingsUF ?? 0) <= 0 && maxLoan != null && maxLoan > 0) {
      const minPiePct = 100 - input.maxFinancingPct;
      const reachablePropertyUF = maxLoan / (input.maxFinancingPct / 100);
      const pieNeededUF = reachablePropertyUF * (minPiePct / 100 + (input.reserveClosingCosts ? 0.02 : 0));
      return {
        label: "tu pie",
        title: "Necesitas ahorro para el pie",
        body: `Los bancos financian máximo ${input.maxFinancingPct}% del valor, así que sin ahorros no puedes cubrir el pie. Tu ingreso sí soporta un crédito de hasta ${formatUF(maxLoan, 0)}.`,
        action: `Con unos ${formatUF(pieNeededUF, 0)} (${formatCLP(pieNeededUF * input.ufValueCLP)}) de ahorro podrías llegar a una propiedad de ${formatUF(reachablePropertyUF, 0)}.`,
      };
    }

    if (isBalanced) {
      return {
        label: "tu ingreso y tu pie",
        title: "Restricción activa: equilibrio entre ingreso y pie",
        body: `Tu pie e ingreso están equilibrados: ambos topan cerca de ${formatUF(output.realisticMaxPropertyUF ?? 0, 0)}.`,
        action: "Para subir tu techo, necesitas mejorar ambos frentes o conseguir mejores condiciones de crédito.",
      };
    }

    if (output.bindingConstraint === "income" && maxLoan != null && savingsUF != null && bySavings != null) {
      return {
        label: "tu ingreso",
        title: "Restricción activa: tu ingreso",
        body: `Tu ingreso soporta un crédito de hasta ${formatUF(maxLoan, 0)}. Sumando tus ahorros como pie (${formatUF(output.downPaymentUF ?? savingsUF, 0)}) llegas a ${formatUF(output.realisticMaxPropertyUF ?? 0, 0)}. El pie mínimo del banco recién te limitaría en ${formatUF(bySavings, 0)}.`,
        action: "Para aumentar tu propiedad máxima: más ingreso, más ahorro, un plazo mayor o una tasa menor.",
      };
    }

    if (output.bindingConstraint === "savings" && maxLoan != null && byIncome != null) {
      return {
        label: "tu pie",
        title: "Restricción activa: tu pie",
        body: `Tus ahorros cubren el pie mínimo de una propiedad de hasta ${formatUF(output.realisticMaxPropertyUF ?? 0, 0)}. Tu ingreso soportaría un crédito mayor, de hasta ${formatUF(maxLoan, 0)}.`,
        action: "Para aumentar tu propiedad máxima, necesitas más ahorro o un banco que financie una mayor proporción.",
      };
    }

    return {
      label: "tu escenario actual",
      title: "Restricción activa: escenario base",
      body: "Tu capacidad estimada ya refleja el equilibrio entre ingreso, pie, plazo y política bancaria.",
      action: "Usa los tabs de sensibilidad para ver cuál palanca mueve más tu resultado.",
    };
  }

  if (input.netMonthlyIncomeAmount == null) {
    return {
      label: "tu objetivo",
      title: "Plan base de tu objetivo",
      body: "Aquí puedes ver el dividendo, el pie y el ingreso mensual necesario para esta propiedad.",
      action: "Ingresa tu ingreso cuando quieras comparar tu situación actual con este objetivo.",
    };
  }

  if (output.bindingConstraint === "bank_policy") {
    return {
      label: "la política del banco",
      title: "Restricción activa: financiamiento máximo",
      body: `Con este banco el crédito no puede superar ${input.maxFinancingPct}% del valor de la propiedad.`,
      action: "Necesitas aportar más pie o evaluar un banco con mayor financiamiento máximo.",
    };
  }

  if (output.bindingConstraint === "income_and_savings") {
    return {
      label: "ingreso y pie",
      title: "Restricción activa: ingreso y pie",
      body: `Hoy te faltan ${formatUF(incomeGap, 2)} de ingreso mensual y ${formatUF(savingsGap, 0)} de ahorro para cerrar la brecha.`,
      action: "Puedes combinar más ahorro, un plazo mayor, una tasa menor o un banco distinto para acercarte al objetivo.",
    };
  }

  if (output.bindingConstraint === "income") {
    const pieToFit = output.downPaymentToFitIncomeUF;
    const savingsUF = getSavingsUF(input);
    const morePieFits =
      pieToFit != null &&
      savingsUF != null &&
      savingsUF >= pieToFit + (output.closingCostsUF ?? 0) - AFFORDABILITY_TOLERANCE_UF;
    return {
      label: "tu ingreso",
      title: "Restricción activa: tu ingreso",
      body: `Con el pie mínimo, el dividendo exige ${formatUF(incomeGap, 2)} más de ingreso mensual.`,
      action: morePieFits
        ? `Tus ahorros alcanzan para resolverlo: con un pie de ${formatUF(pieToFit, 0)} (${formatCLP(pieToFit * input.ufValueCLP)}) el dividendo calza con tu ingreso.`
        : "La palanca principal es subir ingreso o bajar dividendo con más pie, mejor tasa o más plazo.",
    };
  }

  if (output.bindingConstraint === "savings") {
    return {
      label: "tu pie",
      title: "Restricción activa: tu pie",
      body: `Te faltan ${formatUF(savingsGap, 0)} para cubrir el pie requerido de esta propiedad.`,
      action: "La palanca principal es aumentar ahorro o buscar un banco que financie una fracción mayor.",
    };
  }

  const closeIncomeGap = incomeGap > 0 && incomeGap <= AFFORDABILITY_TOLERANCE_UF;
  const closeSavingsGap = savingsGap > 0 && savingsGap <= AFFORDABILITY_TOLERANCE_UF;

  if (output.feasible && (closeIncomeGap || closeSavingsGap)) {
    return {
      label: "un margen estrecho",
      title: "Escenario justo",
      body:
        closeIncomeGap && closeSavingsGap
          ? "El objetivo calza, pero tu ingreso y tus ahorros quedan dentro de un margen muy estrecho."
          : closeIncomeGap
            ? "El objetivo calza, aunque tu ingreso queda dentro de un margen muy estrecho."
            : "El objetivo calza, aunque tus ahorros quedan dentro de un margen muy estrecho.",
      action: "Conviene mantener un pequeño colchón antes de comprometerte.",
    };
  }

  return {
    label: "tu escenario actual",
    title: "Restricción activa: ninguna",
    body: "Tu objetivo ya calza con el ingreso, el pie y las condiciones bancarias actuales.",
    action: "Puedes usar las sensibilidades para explorar cuánto margen tienes antes de salirte de rango.",
  };
}

export function ResultCards({ output, input, status }: Props) {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  const uf = input.ufValueCLP;
  const incomeUF = getIncomeUF(input);
  const savingsUF = getSavingsUF(input);
  const constraintInsight = useMemo(() => getConstraintInsight(output, input), [input, output]);
  const isTarget = input.mode === "target_property";
  const headlineUF = isTarget ? output.propertyPriceUF : output.realisticMaxPropertyUF;

  return (
    <div className="flex flex-col gap-4">
      {headlineUF != null && (
        <div id="resultado" className="result-hero scroll-mt-4 rounded-3xl p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {isTarget ? "Propiedad objetivo" : "Tu propiedad máxima estimada"}
              </p>
              <p className="font-display mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {formatPair(headlineUF ?? 0, uf)}
              </p>
              {isTarget && output.realisticMaxPropertyUF != null && incomeUF != null && (
                <p className="mt-1 text-sm text-slate-600">
                  Con tus datos actuales podrías llegar a{" "}
                  <span className="font-semibold text-slate-800">{formatPair(output.realisticMaxPropertyUF, uf)}</span>.
                </p>
              )}
            </div>
            {/* In income mode the result is the maximum by definition, so a status badge adds nothing. */}
            {isTarget && <StatusBadge status={status} large />}
          </div>

          {constraintInsight && (
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
              <p className="text-sm font-semibold text-slate-900">{constraintInsight.title}</p>
              <p className="mt-1 text-sm text-slate-600">{constraintInsight.body}</p>
              <p className="mt-2 text-sm font-medium text-blue-700">{constraintInsight.action}</p>
            </div>
          )}

          {headlineUF != null && headlineUF > 0 && (
            <p
              className={clsx(
                "mt-3 rounded-xl border px-3 py-2 text-xs leading-5",
                input.reserveClosingCosts
                  ? "border-slate-200 bg-white/70 text-slate-600"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              )}
            >
              {input.reserveClosingCosts ? (
                <>
                  Reservamos <span className="font-semibold">{formatPair(output.closingCostsUF ?? 0, uf)}</span> (2%) de tus
                  ahorros para gastos operacionales: notaría, Conservador de Bienes Raíces, tasación, estudio de títulos e
                  impuesto al mutuo.
                </>
              ) : (
                <>
                  Este cálculo no reserva nada para gastos operacionales (notaría, CBR, tasación, impuesto al mutuo). Suelen
                  costar 1%–3% del valor: {formatUF(headlineUF * 0.01, 0)}–{formatUF(headlineUF * 0.03, 0)}.
                </>
              )}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {output.fullMonthlyDividendUF != null && (
          <Card
            title={input.mode === "income" ? "Dividendo de esta propiedad" : "Dividendo mensual estimado"}
            value={formatPair(output.fullMonthlyDividendUF, uf)}
            sub={`Incluye seguros · total en ${input.termYears} años: ${formatPair(output.fullMonthlyDividendUF * input.termYears * 12, uf)}`}
            tooltipId="dividendo"
          />
        )}

        {input.mode === "income" && output.fullMonthlyDividendUF != null && incomeUF != null && incomeUF > 0 && (
          <Card
            title="Te queda cada mes"
            value={formatCLP((incomeUF - output.fullMonthlyDividendUF) * uf)}
            sub={`Después del dividendo (${formatPctValue((output.fullMonthlyDividendUF / incomeUF) * 100)} de tu ingreso)`}
            tooltipId="carga-financiera"
          />
        )}

        {input.mode === "target_property" && output.requiredIncomeUF != null && (
          <Card
            title="Ingreso requerido"
            value={formatPair(output.requiredIncomeUF, uf)}
            tooltipId="carga-financiera"
            highlight={
              incomeUF != null
                ? incomeUF >= output.requiredIncomeUF
                  ? "positive"
                  : incomeUF >= output.requiredIncomeUF - AFFORDABILITY_TOLERANCE_UF
                    ? "neutral"
                    : "negative"
                : undefined
            }
          />
        )}

        {output.downPaymentUF != null && (
          <Card
            title={input.mode === "income" ? "Pie que aportas" : "Pie requerido"}
            value={formatPair(output.downPaymentUF, uf)}
            sub={
              input.mode === "income" && output.minDownPaymentUF != null
                ? `${input.reserveClosingCosts ? "Tus ahorros menos la reserva" : "Todos tus ahorros"} · mínimo del banco: ${formatUF(output.minDownPaymentUF, 0)}`
                : undefined
            }
            tooltipId="pie"
            highlight={
              savingsUF != null
                ? savingsUF >= output.downPaymentUF + (output.closingCostsUF ?? 0)
                  ? "positive"
                  : savingsUF >= output.downPaymentUF + (output.closingCostsUF ?? 0) - AFFORDABILITY_TOLERANCE_UF
                    ? "neutral"
                    : "negative"
                : undefined
            }
          />
        )}

        {output.loanAmountUF != null && (
          <Card title="Monto del crédito" value={formatPair(output.loanAmountUF, uf)} tooltipId="credito" />
        )}
      </div>

      {input.mode === "target_property" &&
      ((output.incomeGapUF ?? 0) > AFFORDABILITY_TOLERANCE_UF ||
        (output.savingsGapUF ?? 0) > AFFORDABILITY_TOLERANCE_UF) ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(output.incomeGapUF ?? 0) > AFFORDABILITY_TOLERANCE_UF && (
            <Card
              title="Brecha de ingreso"
              value={`+${formatPair(output.incomeGapUF ?? 0, uf)}/mes`}
              highlight="negative"
              sub="Ingreso adicional necesario"
            />
          )}
          {(output.savingsGapUF ?? 0) > AFFORDABILITY_TOLERANCE_UF && (
            <Card
              title="Brecha de ahorros"
              value={`+${formatPair(output.savingsGapUF ?? 0, uf)}`}
              highlight="negative"
              sub={input.reserveClosingCosts ? "Ahorro adicional necesario (incluye gastos operacionales)" : "Ahorro adicional necesario"}
            />
          )}
        </div>
      ) : null}

      {(output.maxPropertyByIncomeUF != null || output.maxPropertyBySavingsUF != null) && (
        <div className="surface-card rounded-2xl p-5 text-sm">
          <p className="mb-2 font-medium text-slate-700">Detalle de restricciones</p>
          <div className="flex flex-col gap-1">
            {output.maxPropertyByIncomeUF != null && (
              <div className="flex justify-between text-slate-600">
                <span>Máximo por ingreso</span>
                <span className="font-semibold">{formatUF(output.maxPropertyByIncomeUF, 0)}</span>
              </div>
            )}
            {output.maxPropertyBySavingsUF != null && (
              <div className="flex justify-between text-slate-600">
                <span>Máximo por pie</span>
                <span className="font-semibold">{formatUF(output.maxPropertyBySavingsUF, 0)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="surface-card overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => setShowFormulaDetails((value) => !value)}
          aria-expanded={showFormulaDetails}
          aria-controls="formula-details"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <span>Cómo se calcula</span>
          <span className="text-xs text-slate-500">{showFormulaDetails ? "Ocultar" : "Ver fórmulas"}</span>
        </button>
        {showFormulaDetails && (
          <div id="formula-details" className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <p>
              Dividendo base: <code>D = P · [r(1+r)^n] / [(1+r)^n − 1]</code>, donde <code>P</code> es el crédito,
              <code>r</code> la tasa mensual y <code>n</code> los meses.
            </p>
            <p className="mt-2">
              Carga financiera: <code>dividendo + seguro ≤ ingreso · {input.maxDividendIncomeRatioPct}%</code>
            </p>
            <p className="mt-2">
              Financiamiento: <code>crédito ≤ propiedad · {input.maxFinancingPct}%</code>
            </p>
            {input.mode === "income" && (
              <p className="mt-2">
                Propiedad máxima: <code>mín((crédito máx. por ingreso + ahorros) ÷ (1 + g), ahorros ÷ (pie mínimo + g))</code>,
                donde <code>g</code> es la reserva para gastos operacionales ({input.reserveClosingCosts ? "2%" : "0%"}). El
                resto de tus ahorros va al pie.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

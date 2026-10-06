"use client";

import { useId, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, ChartLineIcon } from "@hugeicons/core-free-icons";

type SimulatorTab = "simulator" | "calculator" | "comparator";

const tabs: ReadonlyArray<{
  id: SimulatorTab;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
}> = [
  {
    id: "simulator",
    label: "Simulador",
    eyebrow: "01 · EM ALTA",
    title: "Simulador de Investimentos",
    description:
      "Confira indicações de acordo com seu objetivo, perfil, valor e prazo.",
    action: "Quero simular",
  },
  {
    id: "calculator",
    label: "Calculadora",
    eyebrow: "02 · RENDA FIXA",
    title: "Calculadora de Renda Fixa",
    description:
      "Descubra o potencial mensal e anual de CDBs, LCIs e LCAs.",
    action: "Quero calcular",
  },
  {
    id: "comparator",
    label: "Comparador",
    eyebrow: "03 · COMPARADOR",
    title: "Comparador de Investimentos",
    description:
      "Compare classes e descubra como fazer seu dinheiro render mais.",
    action: "Quero comparar",
  },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const DEFAULT_AMOUNT = 50000;
const DEFAULT_MONTHLY = 1000;
const DEFAULT_YEARS = 5;

function compoundValue(principal: number, monthly: number, years: number, annualRate: number) {
  const periods = Math.max(1, years * 12);
  const rate = annualRate / 12;
  return principal * (1 + rate) ** periods + monthly * (((1 + rate) ** periods - 1) / rate);
}

export function InvestmentSimulator() {
  const tabId = useId();
  const [activeTab, setActiveTab] = useState<SimulatorTab>("simulator");
  const [initialAmount, setInitialAmount] = useState(DEFAULT_AMOUNT);
  const [monthlyAmount, setMonthlyAmount] = useState(DEFAULT_MONTHLY);
  const [years, setYears] = useState(DEFAULT_YEARS);

  const output = useMemo(() => {
    const invested = initialAmount + monthlyAmount * years * 12;
    const conservative = compoundValue(initialAmount, monthlyAmount, years, 0.105);
    const balanced = compoundValue(initialAmount, monthlyAmount, years, 0.125);
    const growth = compoundValue(initialAmount, monthlyAmount, years, 0.145);
    if (activeTab === "calculator") {
      return { primary: balanced, label: "Patrimônio estimado", detail: `Com ${currency.format(monthlyAmount)} por mês, você aporta ${currency.format(invested)} no período.` };
    }
    if (activeTab === "comparator") {
      return { primary: growth - conservative, label: "Diferença projetada", detail: `Entre uma estratégia conservadora e uma de maior potencial em ${years} anos.` };
    }
    return { primary: balanced, label: "Valor projetado", detail: `Você investe ${currency.format(invested)} e pode somar ${currency.format(Math.max(0, balanced - invested))} em rentabilidade.` };
  }, [activeTab, initialAmount, monthlyAmount, years]);

  const reset = () => {
    setInitialAmount(DEFAULT_AMOUNT);
    setMonthlyAmount(DEFAULT_MONTHLY);
    setYears(DEFAULT_YEARS);
  };

  const handleAmount = (value: string, setter: (next: number) => void) => {
    const parsed = Number(value.replace(/\D/g, ""));
    setter(Number.isFinite(parsed) ? Math.min(parsed, 2_000_000) : 0);
  };

  return (
    <div aria-label="Simuladores de investimento" data-btg-reveal>

        <div className="grid gap-3 md:grid-cols-3">
          {tabs.map((tab) => {
            const selected = tab.id === activeTab;
            const tone = tab.id === "simulator"
              ? "border-[#2B72FF] bg-[#2B72FF] text-white"
              : tab.id === "calculator"
                ? "border-[#d9e1ea] bg-[#EEF3F8] text-[#06172E]"
                : "border-[#06172E] bg-[#06172E] text-white";
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`group flex min-h-[258px] flex-col justify-between rounded-[2px] border p-6 text-left transition-[border-color,transform,outline-color] duration-200 ease-out active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2B72FF] lg:min-h-[360px] lg:p-8 ${tone} ${selected ? "outline outline-2 outline-offset-4 outline-[#2B72FF]" : "hover:-translate-y-0.5"}`} aria-pressed={selected}>
                <span>
                  <span className={`block text-xs font-bold uppercase tracking-[0.15em] ${tab.id === "calculator" ? "text-[#0055B8]" : "text-[#c9ddff]"}`}>{tab.eyebrow}</span>
                  <span className="mt-12 block text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] lg:text-[34px]">{tab.title}</span>
                  <span className={`mt-4 block text-[15px] leading-[1.5] lg:text-[17px] ${tab.id === "calculator" ? "text-[#06172E]/70" : "text-white/75"}`}>{tab.description}</span>
                </span>
                <span className="mt-8 inline-flex items-center gap-2 text-[15px] font-bold">
                  {tab.action}
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 overflow-hidden rounded-[2px] border border-[#06172e]/10 bg-white" data-btg-reveal>
          <div className="flex flex-col border-b border-[#06172e]/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex rounded-[2px] bg-[#EEF3F8] p-1" role="tablist" aria-label="Ferramentas de investimento">
              {tabs.map((tab) => (
                <button key={tab.id} id={`${tabId}-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`${tabId}-panel`} onClick={() => setActiveTab(tab.id)} className={`rounded-[2px] px-3 py-2 text-xs font-semibold transition-[background-color,color] duration-150 sm:px-4 sm:text-sm ${activeTab === tab.id ? "bg-white text-[#06172E]" : "text-[#06172E]/55 hover:text-[#06172E]"}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={reset} className="mt-3 self-start text-sm font-semibold text-[#0055B8] transition-colors hover:text-[#06172E] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2B72FF] sm:mt-0 sm:self-auto">Restaurar valores</button>
          </div>

          <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${activeTab}`} className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:p-9">
            <div>
              <div className="mb-7 flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[2px] bg-[#EEF3F8] text-[#0055B8]"><HugeiconsIcon icon={ChartLineIcon} size={21} strokeWidth={1.8} aria-hidden="true" /></span>
                <div><p className="text-sm font-semibold text-[#06172E]">{tabs.find((tab) => tab.id === activeTab)?.title}</p><p className="mt-1 text-sm text-[#06172E]/60">Ajuste os dados para ver uma projeção personalizada.</p></div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-[#06172E]">Valor inicial
                  <span className="relative"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-[#06172E]/45">R$</span><input inputMode="numeric" value={initialAmount.toLocaleString("pt-BR")} onChange={(event) => handleAmount(event.target.value, setInitialAmount)} className="h-12 w-full rounded-[2px] border border-[#06172e]/12 bg-white pl-10 pr-3 text-base font-semibold tracking-[-0.02em] outline-none transition-colors focus:border-[#2B72FF] focus:ring-4 focus:ring-[#2B72FF]/10" /></span>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-[#06172E]">Aporte mensal
                  <span className="relative"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-[#06172E]/45">R$</span><input inputMode="numeric" value={monthlyAmount.toLocaleString("pt-BR")} onChange={(event) => handleAmount(event.target.value, setMonthlyAmount)} className="h-12 w-full rounded-[2px] border border-[#06172e]/12 bg-white pl-10 pr-3 text-base font-semibold tracking-[-0.02em] outline-none transition-colors focus:border-[#2B72FF] focus:ring-4 focus:ring-[#2B72FF]/10" /></span>
                </label>
              </div>
              <label className="mt-7 grid gap-3 text-sm font-semibold text-[#06172E]">Prazo de investimento <span className="flex items-baseline justify-between"><span className="text-xs font-medium text-[#06172E]/55">1 ano</span><output className="text-base font-semibold text-[#0055B8]">{years} {years === 1 ? "ano" : "anos"}</output><span className="text-xs font-medium text-[#06172E]/55">30 anos</span></span><input aria-label="Prazo de investimento em anos" type="range" min="1" max="30" value={years} onChange={(event) => setYears(Number(event.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#EEF3F8] accent-[#2B72FF]" /></label>
            </div>
            <aside className="flex flex-col justify-between rounded-[2px] bg-[#06172E] p-6 text-white sm:p-7">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ebeff]">{output.label}</p><output aria-live="polite" className="mt-4 block text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">{currency.format(output.primary)}</output><p className="mt-4 text-sm leading-6 text-white/66">{output.detail}</p></div>
              <a href="#newsletter" className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-[#9ebeff] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white">Falar com especialista <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} aria-hidden="true" /></a>
            </aside>
          </div>
        </div>
    </div>
  );
}

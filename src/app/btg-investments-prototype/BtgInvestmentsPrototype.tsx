import Image from "next/image";
import type { CSSProperties } from "react";
import { BtgHeader } from "./BtgHeader";
import { BtgLogo } from "./BtgLogo";
import { BtgRevealController } from "./BtgRevealController";
import { BlogRail } from "./BlogRail";
import { InvestmentSimulator } from "./InvestmentSimulator";
import { NewsletterSignup } from "./NewsletterSignup";
import styles from "./btg-investments-prototype.module.css";

const objectivePaths = [
  ["Começar com segurança", "Reserva e renda fixa"],
  ["Diversificar com estratégia", "Fundos e carteiras"],
  ["Buscar novas oportunidades", "Bolsa e internacional"],
] as const;

const products = [
  ["Renda Fixa", "Segurança e previsibilidade em diferentes títulos e prazos."],
  ["Renda Variável", "Explore todo o potencial de rentabilidade que a renda variável oferece."],
  ["Fundos de Investimento", "Os melhores fundos do mercado reunidos em um só lugar."],
  ["Previdência Privada", "Planos para construir o futuro com estratégia e eficiência."],
  ["Câmbio", "Envie e receba remessas do exterior com rapidez e segurança."],
  ["Seguros", "Planeje e proteja quem importa com soluções selecionadas."],
  ["Tesouro Direto", "Uma das modalidades mais seguras para começar a investir."],
  ["Custos", "Transparência e os menores custos possíveis — às vezes, zero."],
] as const;

const stories = [
  ["HOJE · 8 MIN", "Juros, inflação e o novo mapa da renda fixa", "O que mudou e onde estão as assimetrias."],
  ["RELATÓRIO", "Onde o BTG vê valor no segundo semestre", "Teses, riscos e horizontes em uma leitura direta."],
  ["PODCAST", "Mercado em 15 minutos", "O essencial da semana, sem ruído."],
] as const;

function revealDelay(delay: number): CSSProperties {
  return { "--btg-reveal-delay": `${delay}ms` } as CSSProperties;
}

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function SectionIntro({ eyebrow, title, body, id, dark = false }: { eyebrow: string; title: string; body: string; id?: string; dark?: boolean }) {
  return (
    <div className="grid gap-7 md:grid-cols-[minmax(0,1.8fr)_minmax(240px,.8fr)] md:items-end md:gap-16">
      <div>
        <p className={`mb-5 text-[13px] font-bold tracking-[.12em] ${dark ? "text-[#a9cbff]" : "text-[#0055b8]"}`}>{eyebrow}</p>
        <h2 id={id} className={`max-w-[780px] text-[clamp(42px,4.05vw,58px)] font-bold leading-[.99] tracking-[-.055em] ${dark ? "text-white" : "text-[#06172e]"}`}>{title}</h2>
      </div>
      <p className={`max-w-[360px] text-[17px] leading-[1.55] ${dark ? "text-[#dce5ef]" : "text-[#475569]"}`}>{body}</p>
    </div>
  );
}

export function BtgInvestmentsPrototype() {
  return (
    <main className={styles.page} id="btg-investments-page">
      <BtgRevealController rootId="btg-investments-page" />
      <BtgHeader />

      <section aria-labelledby="btg-hero-title" className="relative isolate overflow-hidden bg-[#06172e] text-white md:min-h-[760px]">
        <div className="absolute inset-x-0 top-0 h-[760px] md:inset-0 md:h-auto">
          <Image alt="" className="object-cover object-[68%_center] md:object-[63%_center]" fill priority sizes="100vw" src="/btg-investments-prototype/hero.jpg" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,33,65,.1)_0%,rgba(10,33,65,.48)_40%,rgba(6,23,46,.98)_78%,#06172e_100%)] md:bg-[linear-gradient(90deg,rgba(6,23,46,.96)_0%,rgba(10,33,65,.78)_42%,rgba(10,33,65,.02)_76%)]" />
        </div>
        <div className={`${styles.contentFrame} relative flex min-h-[760px] flex-col justify-end pb-10 pt-[300px] md:justify-center md:pb-36 md:pt-20`}>
          <div className="max-w-[620px]">
            <p data-btg-reveal style={revealDelay(0)} className="mb-6 text-[13px] font-bold tracking-[.12em] text-[#a9cbff]">BTG PACTUAL INVESTIMENTOS</p>
            <h1 data-btg-reveal style={revealDelay(80)} id="btg-hero-title" className="max-w-[620px] text-[48px] font-bold leading-[.98] tracking-[-.065em] sm:text-[clamp(52px,6.15vw,88px)]">Seu dinheiro pode ir mais longe.</h1>
            <p data-btg-reveal style={revealDelay(150)} className="mt-7 max-w-[540px] text-[18px] leading-[1.56] text-[#e2e8f0] sm:text-xl">Invista, acompanhe e movimente seu patrimônio com a inteligência e a solidez do BTG.</p>
            <div data-btg-reveal style={revealDelay(220)} className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <a className="inline-flex min-h-[52px] w-full items-center justify-center bg-[#2b72ff] px-6 text-base font-bold transition-transform hover:bg-[#175eea] active:scale-[.97] sm:w-auto" href="#simuladores">Começar a investir</a>
              <a className="inline-flex min-h-[52px] w-full items-center justify-center border border-white/55 px-6 text-base transition-colors hover:bg-white/10 active:scale-[.97] sm:w-auto" href="#objetivos">Explorar o BTG</a>
            </div>
          </div>
        </div>
        <div className="bg-white md:contents">
          <aside data-btg-reveal style={revealDelay(290)} aria-label="Resumo de patrimônio" className={`${styles.contentFrame} ${styles.summaryFrame} relative grid gap-5 bg-white px-6 py-6 text-[#06172e] md:absolute md:bottom-0 md:inset-x-0 md:grid-cols-[250px_1px_minmax(0,1fr)_220px] md:items-center md:gap-6 md:bg-white/95 md:py-5 md:backdrop-blur`}>
            <div><p className="text-xs text-[#64748b]">Seu patrimônio</p><p className="mt-1 text-[28px] font-bold tracking-[-.04em]">R$ 482.750</p><p className="mt-1 text-xs font-bold text-[#087e5b]">+8,4% em 12 meses</p></div>
            <div className="hidden h-14 bg-[#cbd5e1] md:block" />
            <div className="border-t border-[#dde3e9] pt-5 md:border-0 md:pt-0"><p className="text-xs font-bold tracking-[.08em] text-[#0055b8]">PARA VOCÊ HOJE</p><p className="mt-1 text-[19px] font-bold leading-[1.3]">Sua reserva pode render mais sem abrir mão da liquidez.</p><p className="mt-1 text-[13px] text-[#64748b]">Alternativas selecionadas pelo BTG para o seu perfil.</p></div>
            <a className="inline-flex min-h-12 items-center justify-center bg-[#06172e] px-4 text-[15px] font-bold text-white transition-transform hover:bg-[#123458] active:scale-[.97]" href="#produtos">Ver oportunidade <Arrow /></a>
          </aside>
        </div>
      </section>

      <section data-btg-reveal style={revealDelay(0)} aria-label="Diferenciais BTG" className="border-b border-[#d4dbe3] bg-white">
        <div className={`${styles.contentFrame} grid py-10 md:grid-cols-3 md:py-11`}>
        {[["40+", "anos de mercado"], ["Global", "Brasil e mundo conectados"], ["Completo", "investimentos e planejamento"]].map(([value, label], index) => <div className={`flex items-center gap-5 py-3 md:justify-center ${index ? "md:border-l md:border-[#d4dbe3]" : ""}`} key={value}><strong className="text-[clamp(32px,2.8vw,40px)] leading-none tracking-[-.05em] text-[#06172e]">{value}</strong><span className="text-[15px] text-[#536273]">{label}</span></div>)}
        </div>
      </section>

      <section id="objetivos" aria-labelledby="objectives-heading" className="scroll-mt-[68px] grid bg-[#2b72ff] lg:scroll-mt-[84px] lg:grid-cols-2">
        <div className={`${styles.contentGutter} flex min-h-[633px] flex-col justify-between py-16 lg:min-h-[720px] lg:py-[72px]`}>
          <div className="max-w-[576px]"><p data-btg-reveal style={revealDelay(0)} className="mb-5 text-[13px] font-bold tracking-[.12em] text-[#06172e]">UM BTG PARA CADA OBJETIVO</p><h2 data-btg-reveal style={revealDelay(70)} id="objectives-heading" className="text-[clamp(44px,4.6vw,66px)] font-bold leading-[.99] tracking-[-.06em] text-white">Encontre o próximo passo.</h2><p data-btg-reveal style={revealDelay(130)} className="mt-6 max-w-[500px] text-lg leading-[1.55] text-[#eaf2ff]">Do primeiro aporte à diversificação global, veja caminhos claros para colocar seu dinheiro em movimento.</p></div>
          <div data-btg-reveal style={revealDelay(190)} className="mt-12 border-t border-white/45">{objectivePaths.map(([title, detail], index) => <a className="group grid grid-cols-[32px_1fr_28px] items-center gap-4 border-b border-white/45 py-4 transition-colors hover:bg-[#1762e8]" href="#produtos" key={title}><span className="text-xs font-bold text-[#06172e]">{String(index + 1).padStart(2, "0")}</span><span><strong className="block text-lg text-white">{title}</strong><span className="mt-0.5 block text-[13px] text-[#dceaff]">{detail}</span></span><span className="text-2xl text-white transition-transform group-hover:translate-x-1"><Arrow /></span></a>)}</div>
        </div>
        <div className="relative min-h-[390px]"><Image alt="Escultura azul representando o movimento de uma carteira de investimentos" className="object-cover" fill sizes="(max-width: 1023px) 100vw, 50vw" src="/btg-investments-prototype/investment-sculpture.webp" /></div>
      </section>

      <section id="simuladores" aria-labelledby="simulators-heading" className="scroll-mt-[68px] bg-white py-20 md:py-24 lg:scroll-mt-[84px]">
        <div data-btg-reveal style={revealDelay(0)} className={`${styles.contentFrame}`}><SectionIntro body="Teste cenários, compare alternativas e encontre caminhos alinhados ao seu momento." eyebrow="PLANEJE COM CLAREZA" id="simulators-heading" title="Decisões melhores começam com uma boa simulação." /><div className="mt-12"><InvestmentSimulator /></div></div>
      </section>

      <section id="produtos" aria-labelledby="products-heading" className="scroll-mt-[68px] bg-[#f3f6f9] py-20 md:py-24 lg:scroll-mt-[84px]">
        <div className={styles.contentFrame}>
          <div data-btg-reveal style={revealDelay(0)}>
            <SectionIntro
              body="Uma prateleira extensa para alocar, diversificar e proteger seu patrimônio."
              eyebrow="PORTFÓLIO COMPLETO"
              id="products-heading"
              title="Produtos premiados na medida dos seus sonhos."
            />
          </div>
          <div className="mt-12 grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {products.map(([name, description], index) => (
              <a
                data-btg-reveal
                style={revealDelay((index % 4) * 55)}
                className="group grid min-h-[88px] grid-cols-[34px_minmax(0,1fr)_24px] items-center gap-4 border-b border-[#cbd5e1] py-4 transition-[transform,background-color] hover:bg-white/55 active:scale-[.985] sm:flex sm:min-h-[224px] sm:flex-col sm:items-stretch sm:justify-between sm:border sm:border-[#d4dbe3] sm:bg-white sm:p-7 sm:hover:-translate-y-1 sm:hover:bg-[#f8fbff]"
                href="#contato"
                key={name}
              >
                <span className="text-[13px] font-bold tracking-[.12em] text-[#0055b8]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong className="block text-[20px] leading-[1.15] tracking-[-.03em] text-[#06172e] sm:text-[26px]">
                    {name}
                  </strong>
                  <span className="mt-1 block text-[14px] leading-[1.4] text-[#536273] sm:mt-3 sm:text-[15px] sm:leading-[1.45]">
                    {description}
                  </span>
                </span>
                <span className="justify-self-end text-xl font-bold text-[#06172e] sm:justify-self-auto sm:text-[15px]">
                  <span className="sm:hidden"><Arrow /></span>
                  <span className="hidden sm:inline">Saiba mais <Arrow /></span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="assessoria" aria-labelledby="advisory-heading" className="relative isolate min-h-[600px] overflow-hidden bg-[#06172e] text-white"><Image alt="Especialista conversando com cliente" className="object-cover object-[72%_center] md:object-[63%_center]" fill sizes="100vw" src="/btg-investments-prototype/advisory.jpg" /><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,23,46,.12)_0%,rgba(6,23,46,.96)_68%)] md:bg-[linear-gradient(90deg,rgba(6,23,46,.96)_0%,rgba(10,33,65,.72)_47%,transparent_76%)]" /><div className={`${styles.contentFrame} relative flex min-h-[600px] flex-col justify-end py-16 md:justify-center md:py-20`}><div className="max-w-[620px]"><p data-btg-reveal style={revealDelay(0)} className="mb-5 text-[13px] font-bold tracking-[.12em] text-[#a9cbff]">INTELIGÊNCIA HUMANA, QUANDO IMPORTA</p><h2 data-btg-reveal style={revealDelay(70)} id="advisory-heading" className="text-[clamp(42px,4.05vw,58px)] font-bold leading-[1] tracking-[-.055em]">Autonomia para investir. Especialistas para ir além.</h2><p data-btg-reveal style={revealDelay(140)} className="mt-6 max-w-[540px] text-lg leading-[1.55] text-[#dce5ef]">Explore por conta própria ou conte com uma assessoria que entende seu momento, seu patrimônio e o que vem depois.</p><div data-btg-reveal style={revealDelay(210)} className="mt-9 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6"><a className="inline-flex min-h-[50px] items-center justify-center bg-[#2b72ff] px-6 text-[15px] font-bold transition-transform hover:bg-[#175eea] active:scale-[.97]" href="#contato">Conhecer a assessoria</a><a className="text-[15px] font-bold hover:text-[#a9cbff]" href="#contato">Como funciona <Arrow /></a></div></div></div></section>

      <section id="mercado" aria-labelledby="market-heading" className="bg-[#eef3f8] py-20 md:py-21"><div className={`${styles.contentFrame} grid gap-14 lg:grid-cols-[480px_minmax(0,728px)] lg:justify-between`}><div data-btg-reveal style={revealDelay(0)}><p className="mb-5 text-[13px] font-bold tracking-[.12em] text-[#0055b8]">VISÃO DE MERCADO</p><h2 id="market-heading" className="max-w-[480px] text-[clamp(42px,4.05vw,58px)] font-bold leading-[.99] tracking-[-.055em] text-[#06172e]">Entenda antes de investir.</h2><p className="mt-6 max-w-[430px] text-[17px] leading-[1.55] text-[#475569]">Leituras objetivas para transformar movimento de mercado em decisão de carteira.</p></div><div data-btg-reveal style={revealDelay(90)} className="border-t border-[#9aa9ba]">{stories.map(([type, title, summary]) => <a className="group grid grid-cols-[minmax(0,1fr)_24px] gap-4 border-b border-[#9aa9ba] py-6 transition-colors hover:bg-white/50 md:grid-cols-[92px_minmax(0,1fr)_28px]" href="#newsletter" key={title}><span className="col-span-2 pt-1 text-xs font-bold tracking-[.06em] text-[#0055b8] md:col-span-1">{type}</span><span><strong className="block text-[22px] leading-[1.25] text-[#06172e]">{title}</strong><span className="mt-1 block text-sm text-[#64748b]">{summary}</span></span><span className="self-center text-2xl text-[#06172e] transition-transform group-hover:translate-x-1"><Arrow /></span></a>)}</div></div></section>

      <section id="newsletter" aria-label="Cadastro no BTG Content" className="bg-[#06172e] py-16"><div className={`${styles.contentFrame} ${styles.narrowFrame} mx-auto grid gap-10 md:grid-cols-2 md:items-center`}><div data-btg-reveal style={revealDelay(0)}><p className="mb-5 text-[13px] font-bold tracking-[.12em] text-[#a9cbff]">BTG CONTENT</p><h2 className="text-[clamp(38px,3.3vw,44px)] font-bold leading-[1] tracking-[-.045em] text-white">Receba conteúdos gratuitos por e-mail.</h2><p className="mt-5 max-w-[470px] text-[17px] leading-[1.55] text-[#dce5ef]">Relatórios, recomendações de investimento e leituras para decidir com mais contexto.</p></div><div data-btg-reveal style={revealDelay(80)}><NewsletterSignup /></div></div></section>

      <section id="conteudos" aria-label="Artigos do BTG Content" className="bg-white py-20 md:py-24"><div className={styles.contentFrame}><div data-btg-reveal style={revealDelay(0)}><SectionIntro body="Aprofunde seu conhecimento sobre o mercado financeiro e invista com estratégia." eyebrow="CONTEÚDO PARA DECIDIR" title="Os melhores conteúdos sobre investimentos." /></div><div data-btg-reveal style={revealDelay(100)} className="mt-12"><BlogRail /></div><div data-btg-reveal style={revealDelay(160)} className="mt-10"><a className="inline-flex min-h-[52px] items-center bg-[#06172e] px-6 text-[15px] font-bold text-white transition-transform hover:bg-[#123458] active:scale-[.97]" href="#newsletter">Acesse o BTG Content <Arrow /></a></div></div></section>

      <section id="contato" aria-labelledby="contact-heading" className="border-t border-[#26313e] bg-[#050a11] py-14 text-white"><div className={`${styles.contentFrame} flex flex-col gap-8 md:flex-row md:items-center md:justify-between`}><div><h2 id="contact-heading" className="max-w-[760px] text-[clamp(36px,3.15vw,45px)] font-bold leading-[1.03] tracking-[-.045em]">Uma estratégia à altura do que você construiu.</h2><p className="mt-3 text-sm leading-[1.5] text-[#98a7b8]">Conte seus objetivos. Nós conectamos inteligência e próximos passos.</p></div><a className="inline-flex min-h-[50px] shrink-0 items-center justify-center bg-[#2b72ff] px-6 text-sm font-bold transition-transform hover:bg-[#175eea] active:scale-[.97]" href="mailto:investimentos@btgpactual.com">Falar com um especialista</a></div></section>

      <footer className="bg-[#05132a] py-16 text-[#dce5ef] md:py-[72px]"><div className={styles.contentFrame}><div className="flex flex-wrap items-center justify-between gap-6 border-b border-[#26313e] pb-10"><BtgLogo inverse className="h-[50px] w-32" /><p className="text-[15px]">Inteligência, confiança e visão global.</p></div><div className="grid gap-12 border-b border-[#26313e] py-12 md:grid-cols-[1fr_1.65fr_.8fr]"><FooterColumn title="O que você está buscando?" links={["Investimentos", "Banking", "Empresas", "Precatórios", "Seguros"]} /><FooterColumn title="O BTG Pactual" links={["Investment Banking", "Wealth Management", "Asset Management", "Sales & Trading", "Assessor de Investimentos", "Relação com Investidores", "Corporate Lending", "Blog"]} columns /><FooterColumn title="Carreiras BTG" links={["Buscar vagas →"]} /></div><div className="border-b border-[#26313e] py-10"><h2 className="text-2xl font-bold text-white">Fale conosco</h2><div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"><ContactBlock label="CHAT NO APLICATIVO" text="24 horas por dia, 7 dias por semana." /><ContactBlock label="CENTRAL DE ATENDIMENTO" text="4007-2511 · Capitais e regiões metropolitanas\n0800-001-2511 · Demais localidades" /><ContactBlock label="SAC" text="0800-772-2827 · Demais localidades\n0800-047-4335 · Deficiência auditiva ou de fala" /><ContactBlock label="OUTROS" text="Perguntas frequentes\nCanal de Denúncias\nOuvidoria: 0800-722-0048" /></div></div><div className="grid gap-10 py-10 md:grid-cols-[1.4fr_1fr_.7fr]"><FooterColumn compact title="Acesse também" links={["Atendimento CVM · Atendimento MRP · Disclaimer", "Fundos Imobiliários · Agente Autônomo", "Política e Termos · Segurança da informação"]} /><FooterColumn compact title="Localidades" links={["Brasil · Argentina · Estados Unidos · Colômbia · Chile", "Peru · Inglaterra · México · Portugal"]} /><FooterColumn compact title="Redes sociais" links={["Instagram · LinkedIn · YouTube", "Telegram · TikTok · Spotify · WhatsApp"]} /></div></div></footer>
      <div className="bg-[#050a11]"><div className={`${styles.contentFrame} py-9 text-[13px] leading-[1.55] text-[#98a7b8] md:flex md:items-center md:justify-between`}><p>© 2026 BTG Pactual — CNPJ 30.306.294/0002-26<br />Av. Brigadeiro Faria Lima, 3477 — São Paulo, SP</p><div className="mt-5 flex gap-3 md:mt-0"><span className="border border-[#475569] px-3 py-2 text-xs text-white">CVM</span><span className="border border-[#475569] px-3 py-2 text-xs text-white">ANBIMA</span><span className="border border-[#475569] px-3 py-2 text-xs text-white">B3</span></div></div></div>
    </main>
  );
}

function FooterColumn({ title, links, columns = false, compact = false }: { title: string; links: readonly string[]; columns?: boolean; compact?: boolean }) {
  return <div><h3 className={`${compact ? "text-lg" : "text-xl"} font-bold text-white`}>{title}</h3><div className={`mt-4 ${columns ? "grid gap-x-8 sm:grid-cols-2" : ""}`}>{links.map((link) => <a className={`block py-1 hover:text-[#a9cbff] ${compact ? "text-[15px] leading-[1.5]" : "text-base leading-[1.85]"}`} href="#btg-investments-page" key={link}>{link}</a>)}</div></div>;
}

function ContactBlock({ label, text }: { label: string; text: string }) {
  return <div><p className="text-[13px] font-bold tracking-[.08em] text-[#a9cbff]">{label}</p><p className="mt-3 whitespace-pre-line text-[15px] leading-[1.55]">{text}</p></div>;
}

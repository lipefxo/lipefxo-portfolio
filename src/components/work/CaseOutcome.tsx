import type { CaseStudy } from "@/config/site";

/** Closing outcome / reflection, emphasized in a soft panel. */
export function CaseOutcome({
  outcome,
}: {
  outcome: NonNullable<CaseStudy["outcome"]>;
}) {
  return (
    <section className="space-y-5 rounded-lg border border-zinc-200 bg-zinc-50/60 p-8 dark:border-zinc-800 dark:bg-zinc-900/30">
      {outcome.heading && (
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
          {outcome.heading}
        </h2>
      )}
      {outcome.body.map((paragraph, i) => (
        <p
          key={i}
          className="text-[15px] leading-7 text-zinc-600 dark:text-zinc-400"
        >
          {paragraph}
        </p>
      ))}
    </section>
  );
}

import type { CaseStat } from "@/config/site";

/** Stat band — 1–3 big headline metrics. */
export function CaseStats({ stats }: { stats: CaseStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-8 rounded-lg border border-zinc-200 bg-white/50 p-8 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950/40">
      {stats.map((s) => (
        <div key={s.label} className="space-y-1.5">
          <div className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
            {s.value}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

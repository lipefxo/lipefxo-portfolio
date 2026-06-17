import type { CaseGitStats as CaseGitStatsData } from "@/config/site";

/** Format an integer with thousands separators, deterministically. */
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** A compact, GitHub-flavored contribution line: branch/commits · +adds · −dels. */
export function CaseGitStats({ git }: { git: CaseGitStatsData }) {
  const { prs, commits, additions, deletions } = git;

  // Lead metric: merged PRs (branch icon) or, for PR-less repos, commits (commit icon).
  const lead =
    typeof prs === "number"
      ? { value: prs, label: "PRs merged", icon: "branch" as const }
      : typeof commits === "number"
        ? { value: commits, label: "commits", icon: "commit" as const }
        : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-500">
      {lead && (
        <span className="inline-flex items-center gap-1.5">
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="currentColor"
            aria-hidden="true"
            className="text-zinc-400 dark:text-zinc-500"
          >
            {lead.icon === "branch" ? (
              <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
            ) : (
              <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
            )}
          </svg>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {fmt(lead.value)}
          </span>
          <span>{lead.label}</span>
        </span>
      )}

      {(typeof additions === "number" || typeof deletions === "number") && (
        <span className="inline-flex items-center gap-2">
          {typeof additions === "number" && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              +{fmt(additions)}
            </span>
          )}
          {typeof deletions === "number" && (
            <span className="font-medium text-red-600 dark:text-red-400">
              −{fmt(deletions)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

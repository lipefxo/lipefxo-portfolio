"use client";

export type CaseViewMode = "story" | "tldr";

interface CaseViewToggleProps {
  mode: CaseViewMode;
  onChange: (mode: CaseViewMode) => void;
}

const options: { label: string; value: CaseViewMode }[] = [
  { label: "Story", value: "story" },
  { label: "TL;DR", value: "tldr" },
];

export function CaseViewToggle({ mode, onChange }: CaseViewToggleProps) {
  return (
    <div
      className="inline-flex rounded-md border border-zinc-200 bg-white/60 p-0.5 text-xs text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/45 dark:text-zinc-400"
      aria-label="Case study view"
      role="group"
    >
      {options.map((option) => {
        const active = option.value === mode;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`h-6 rounded-[5px] px-2 text-xs font-medium transition-colors ${
              active
                ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

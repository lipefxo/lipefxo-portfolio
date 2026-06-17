import { TransitionLink } from "@/components/TransitionLink";

/** Slim top bar with a back link to the home page. */
export function CaseStudyHeader() {
  return (
    <header className="flex items-center">
      <TransitionLink
        href="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
        Back
      </TransitionLink>
    </header>
  );
}

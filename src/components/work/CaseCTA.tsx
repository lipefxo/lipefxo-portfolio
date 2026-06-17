import { site } from "@/config/site";

/** Closing call-to-action with an email link. */
export function CaseCTA() {
  return (
    <section className="space-y-4 border-t border-zinc-200 pt-12 text-center dark:border-zinc-800">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {"Let’s work together"}
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {"Have a project in mind? I’d love to hear about it."}
      </p>
      <div className="pt-2">
        <a
          href={`mailto:${site.socials.email}`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-300"
        >
          {site.socials.email}
        </a>
      </div>
    </section>
  );
}

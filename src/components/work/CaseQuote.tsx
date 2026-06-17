import type { CaseQuote as CaseQuoteData } from "@/config/site";

/** Large pull-quote / reflection. */
export function CaseQuote({ quote }: { quote: CaseQuoteData }) {
  return (
    <figure className="space-y-4 border-l-2 border-zinc-300 pl-6 dark:border-zinc-700">
      <blockquote className="text-xl leading-relaxed font-medium tracking-tight text-balance text-zinc-800 sm:text-2xl dark:text-zinc-200">
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      {quote.attribution && (
        <figcaption className="text-sm text-zinc-500 dark:text-zinc-500">
          {quote.attribution}
        </figcaption>
      )}
    </figure>
  );
}

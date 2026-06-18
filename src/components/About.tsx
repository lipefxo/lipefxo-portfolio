import type { CSSProperties, ReactNode } from "react";
import { site } from "@/config/site";
import { getSvglIcon } from "@/lib/svgl-icons";
import { CyclingTokens } from "./CyclingTokens";
import { SvglInlineIcon } from "./SvglInlineIcon";
import { TypingDots } from "./TypingDots";

/* The bio renders as two paragraphs. The first sentence turns "talking at
   screens" into two independent, cycling tokens — "<action> <tool>". Each
   action carries its own preposition so the sentence stays grammatical against
   any tool ("staring at Claude", "pleading with Figma"). The cycles run at
   different speeds and are offset so they never swap at the same moment. */
const SWAP_PHRASE = "talking at screens";
const CONNECTIVE = "while ";

const ACTION_WORDS = [
  "talking to",
  "whispering to",
  "staring at",
  "pleading with",
  "arguing with",
  "muttering to",
  "gesturing at",
  "drawing with",
  "planning with",
  "building with",
  "designing in",
  "exploring with",
  "cooking with",
  "shimmering with",
  "maxxing with",
  "concatenating with",
  "choo-chooing with",
];

const TOOLS: Array<{ label: string; iconKey: string }> = [
  { label: "Claude", iconKey: "claude" },
  { label: "Codex", iconKey: "codex" },
  { label: "Cursor", iconKey: "cursor" },
  { label: "Figma", iconKey: "figma" },
  { label: "Paper", iconKey: "paper" },
  { label: "Conductor", iconKey: "conductor" },
];

const SHIMMER_TEXT = "details";

const paragraphClass =
  "max-w-[48ch] text-base leading-7 text-zinc-700 dark:text-zinc-300";

const introParagraphClass =
  "text-base leading-7 text-zinc-700 dark:text-zinc-300";

const toolItems: ReactNode[] = TOOLS.map(({ label, iconKey }) => {
  const icon = getSvglIcon(iconKey);
  return (
    <span
      key={label}
      className="whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100"
    >
      {icon && <SvglInlineIcon route={icon.route} />}
      <span
        className={["t-text-shimmer", icon ? "ml-1" : null]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </span>
    </span>
  );
});

/** Splits the bio into its two sentences on the first ". " boundary. */
function splitParagraphs(text: string): [string, string] {
  const idx = text.indexOf(". ");
  if (idx < 0) return [text, ""];
  return [text.slice(0, idx + 1), text.slice(idx + 2)];
}

export function About() {
  const [intro, rest] = splitParagraphs(site.bio);

  // First paragraph: swap "[while ]talking at screens" for the cycles, keeping
  // the connective + both tokens together on one line.
  const phraseIndex = intro.indexOf(SWAP_PHRASE);
  const hasPhrase = phraseIndex >= 0;
  const connectiveStart = hasPhrase
    ? intro.lastIndexOf(CONNECTIVE, phraseIndex)
    : -1;
  const leadIn = hasPhrase
    ? intro.slice(0, connectiveStart >= 0 ? connectiveStart : phraseIndex)
    : intro;
  const connective =
    connectiveStart >= 0 ? intro.slice(connectiveStart, phraseIndex) : "";
  const afterPhrase = hasPhrase
    ? intro.slice(phraseIndex + SWAP_PHRASE.length).replace(/^\./, "")
    : "";

  // Second paragraph: shimmer the final "details".
  const shimmerIndex = rest.lastIndexOf(SHIMMER_TEXT);
  const hasShimmer = shimmerIndex >= 0;
  const beforeShimmer = hasShimmer ? rest.slice(0, shimmerIndex) : rest;
  const afterShimmer = hasShimmer
    ? rest.slice(shimmerIndex + SHIMMER_TEXT.length)
    : "";

  return (
    <section
      id="about"
      className="t-intro-item scroll-mt-20 space-y-4"
      style={{ "--intro-index": 3 } as CSSProperties}
    >
      <p className={introParagraphClass}>
        {leadIn}
        {hasPhrase && (
          <span className="block whitespace-nowrap sm:inline">
            {connective}
            <CyclingTokens
              action={{
                items: ACTION_WORDS,
                interval: 2600,
                offset: 2400,
                className: "t-text-shimmer",
              }}
              tool={{ items: toolItems, interval: 4100, offset: 4000 }}
              separator={
                <>
                  {" "}
                  <TypingDots />{" "}
                </>
              }
            />
            {afterPhrase}
          </span>
        )}
      </p>
      {rest && (
        <p className={paragraphClass}>
          {beforeShimmer}
          {hasShimmer && (
            <span className="t-shimmer" data-text={SHIMMER_TEXT}>
              {SHIMMER_TEXT}
            </span>
          )}
          {afterShimmer}
        </p>
      )}
    </section>
  );
}

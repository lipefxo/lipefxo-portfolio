/* eslint-disable @next/next/no-img-element */
import type { SvglRoute } from "@/lib/svgl-icons";

/* Sized to the surrounding text (1em) and nudged onto its baseline. */
const ICON_BASE =
  "t-app-logo size-[0.95em] shrink-0 align-[-0.13em] object-contain";

const imgProps = {
  "aria-hidden": true,
  decoding: "async" as const,
  loading: "lazy" as const,
  referrerPolicy: "no-referrer" as const,
};

/** Renders an SVGL icon inline with text, swapping light/dark variants. */
export function SvglInlineIcon({ route }: { route: SvglRoute }) {
  if (typeof route === "string") {
    return (
      <img src={route} alt="" className={`inline-block ${ICON_BASE}`} {...imgProps} />
    );
  }

  return (
    <>
      <img
        src={route.light}
        alt=""
        className={`inline-block ${ICON_BASE} dark:hidden`}
        {...imgProps}
      />
      <img
        src={route.dark}
        alt=""
        className={`hidden ${ICON_BASE} dark:inline-block`}
        {...imgProps}
      />
    </>
  );
}

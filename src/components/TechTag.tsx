/* eslint-disable @next/next/no-img-element */
import { getSvglIcon, type SvglRoute } from "@/lib/svgl-icons";

type TechTagVariant = "compact" | "default";

interface TechTagProps {
  label: string;
  variant?: TechTagVariant;
  className?: string;
}

const baseClassName =
  "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white/55 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400";

const variantClassNames: Record<TechTagVariant, string> = {
  compact: "h-6 px-2 text-[11px]",
  default: "h-7 px-2.5 text-[11px]",
};

export function TechTag({
  label,
  variant = "default",
  className,
}: TechTagProps) {
  const icon = getSvglIcon(label);
  const classes = [
    baseClassName,
    variantClassNames[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {icon && <TechIcon route={icon.route} />}
      <span className="truncate">{label}</span>
    </span>
  );
}

function TechIcon({ route }: { route: SvglRoute }) {
  if (typeof route === "string") {
    return (
      <img
        src={route}
        alt=""
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 object-contain"
        loading="lazy"
      />
    );
  }

  return (
    <>
      <img
        src={route.light}
        alt=""
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 object-contain dark:hidden"
        loading="lazy"
      />
      <img
        src={route.dark}
        alt=""
        aria-hidden="true"
        className="hidden h-3.5 w-3.5 shrink-0 object-contain dark:block"
        loading="lazy"
      />
    </>
  );
}

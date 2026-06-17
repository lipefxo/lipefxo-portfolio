import type { CaseSection as CaseSectionData } from "@/config/site";
import { ImagePlaceholder } from "./ImagePlaceholder";

/** A narrative block: editorial heading + paragraphs + optional images. */
export function CaseSection({ section }: { section: CaseSectionData }) {
  const layout = section.layout ?? "stack";
  const imageWrap =
    layout === "split"
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
      : layout === "gallery"
        ? "grid grid-cols-2 gap-4 sm:grid-cols-3"
        : "flex flex-col gap-4";

  return (
    <section className="space-y-5">
      {section.heading && (
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
          {section.heading}
        </h2>
      )}

      {section.body?.map((paragraph, i) => (
        <p
          key={i}
          className="text-[15px] leading-7 text-zinc-600 dark:text-zinc-400"
        >
          {paragraph}
        </p>
      ))}

      {section.images && section.images.length > 0 && (
        <div className={`pt-1 ${imageWrap}`}>
          {section.images.map((image, i) => (
            <ImagePlaceholder key={i} image={image} />
          ))}
        </div>
      )}
    </section>
  );
}

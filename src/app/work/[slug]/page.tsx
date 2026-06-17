import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { getWorkBySlug, workSlugs } from "@/lib/projects";
import { Nav } from "@/components/Nav";
import { DarkVeil } from "@/components/DarkVeil";
import { IntroReveal } from "@/components/IntroReveal";
import { CaseStudyView } from "@/components/work/CaseStudyView";

type Params = Promise<{ slug: string }>;

/** Append an alpha channel to a #RRGGBB hex; returns the input unchanged otherwise. */
function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/** Prerender a static page for every work project that has a case study. */
export function generateStaticParams() {
  return workSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getWorkBySlug(slug);
  if (!project?.caseStudy) return {};

  const title = `${project.name} — ${site.name}`;
  const description = project.caseStudy.summary;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
  };
}

export default async function WorkCaseStudyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = getWorkBySlug(slug);
  if (!project?.caseStudy) notFound();
  const cs = project.caseStudy;

  // Next case study, wrapping around to the first.
  const studies = site.work.filter((w) => w.caseStudy);
  const i = studies.findIndex((w) => w.slug === slug);
  const next = studies.length > 1 ? studies[(i + 1) % studies.length] : undefined;

  // Per-project dark-mode background tint, driven by the project's glow palette.
  const tint = project.glow?.colors?.[0];
  const tint2 = project.glow?.colors?.[1] ?? tint;
  // Build the wash inline (hex + alpha) so it survives CSS minification.
  const tintBg =
    tint &&
    `radial-gradient(72% 56% at 18% -10%, ${withAlpha(tint, 0.3)}, transparent 60%), radial-gradient(56% 50% at 90% -6%, ${withAlpha(tint2 ?? tint, 0.2)}, transparent 62%)`;
  // The glow color's HSL triple ("142 58 34") starts with the hue — reuse it to
  // shift the DarkVeil texture toward the same family. Falls back to the home hue.
  const hue = Number(project.glow?.glowColor?.split(" ")[0]);
  const veilHue = Number.isFinite(hue) ? hue : 34;

  return (
    <div className="relative flex min-h-screen w-full flex-1 justify-center overflow-hidden bg-white dark:bg-black">
      <div className="pointer-events-none fixed inset-0 z-0">
        <DarkVeil
          className="opacity-0 dark:opacity-[0.22]"
          hueShift={veilHue}
          noiseIntensity={0.05}
          scanlineIntensity={0.08}
          scanlineFrequency={1.8}
          speed={0.35}
          warpAmount={0.45}
          resolutionScale={0.9}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 dark:bg-[radial-gradient(circle_at_50%_34%,rgba(0,0,0,0.38),rgba(0,0,0,0.48)_48%,rgba(0,0,0,0.68)_100%)]" />
      {tintBg && (
        <div
          className="work-tint pointer-events-none fixed inset-0 z-0"
          style={{ background: tintBg }}
          aria-hidden="true"
        />
      )}
      <Nav />

      <IntroReveal className="relative z-10 w-full max-w-3xl px-6 py-16 sm:px-10 sm:py-24">
        <CaseStudyView cs={cs} tech={project.tech} next={next} />
      </IntroReveal>
    </div>
  );
}

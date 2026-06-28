import type { CSSProperties } from "react";
import { site } from "@/config/site";
import { workToDetail } from "@/lib/projects";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Experience } from "@/components/Experience";
import { Projects } from "@/components/Projects";
import { Currently } from "@/components/Currently";
import { DarkVeil } from "@/components/DarkVeil";
import { IntroReveal } from "@/components/IntroReveal";

export default async function Home() {
  const workDetails = site.work.map(workToDetail);

  return (
    <div className="relative flex min-h-screen w-full flex-1 justify-center overflow-hidden bg-white dark:bg-black">
      <div className="pointer-events-none fixed inset-0 z-0">
        <DarkVeil
          className="opacity-0 dark:opacity-[0.22]"
          hueShift={34}
          noiseIntensity={0.05}
          scanlineIntensity={0.08}
          scanlineFrequency={1.8}
          speed={0.35}
          warpAmount={0.45}
          resolutionScale={0.9}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 dark:bg-[radial-gradient(circle_at_50%_34%,rgba(0,0,0,0.38),rgba(0,0,0,0.48)_48%,rgba(0,0,0,0.68)_100%)]" />
      <Nav />
      <IntroReveal className="relative z-10 w-full max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
        <div className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="flex flex-col gap-10">
            <Hero />
            <About />
          </div>
          <div className="lg:pt-60">
            <Experience />
          </div>
        </div>

        <div className="mt-16 space-y-16">
          <Projects work={workDetails} />
          <Currently />
          <footer
            className="t-intro-item pt-8 text-xs text-zinc-400 dark:text-zinc-600"
            style={{ "--intro-index": 8 } as CSSProperties}
          >
            © {site.name}
          </footer>
        </div>
      </IntroReveal>
    </div>
  );
}

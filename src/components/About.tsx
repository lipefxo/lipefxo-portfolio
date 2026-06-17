import { site } from "@/config/site";

export function About() {
  return (
    <section id="about" className="scroll-mt-20">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        About
      </h2>
      <p className="max-w-2xl text-lg leading-8 text-zinc-700 dark:text-zinc-300">
        {site.bio}
      </p>
    </section>
  );
}

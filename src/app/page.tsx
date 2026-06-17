import { site } from "@/config/site";
import { getRepos } from "@/lib/github";
import { repoToDetail, workToDetail } from "@/lib/projects";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Experience } from "@/components/Experience";
import { Projects } from "@/components/Projects";
import { Skills } from "@/components/Skills";
import { Contact } from "@/components/Contact";

export default async function Home() {
  const { featured, feed, activity } = await getRepos();

  const workDetails = site.work.map(workToDetail);
  const featuredDetails = featured.map(repoToDetail);
  const feedDetails = feed.map(repoToDetail);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <ThemeToggle />
      <main className="w-full max-w-3xl space-y-20 px-6 py-16 sm:px-10 sm:py-24">
        <Hero />
        <About />
        <Projects
          work={workDetails}
          featured={featuredDetails}
          feed={feedDetails}
          activity={activity}
        />
        <Experience />
        <Skills />
        <Contact />
        <footer className="border-t border-zinc-200 pt-8 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
          © {site.name}
        </footer>
      </main>
    </div>
  );
}

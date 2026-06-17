import { site } from "@/config/site";

export function Contact() {
  const { email, github, x, linkedin } = site.socials;

  const links = [
    { label: "Email", href: `mailto:${email}` },
    { label: "GitHub", href: `https://github.com/${github}` },
    { label: "X", href: `https://x.com/${x}` },
    { label: "LinkedIn", href: linkedin },
  ];

  return (
    <section id="contact" className="scroll-mt-20">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        Contact
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`mailto:${email}`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-300"
        >
          {email}
        </a>
        <a
          href={site.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-5 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
        >
          Résumé
        </a>
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

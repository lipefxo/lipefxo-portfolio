import { site } from "@/config/site";

export function Skills() {
  return (
    <section id="skills" className="scroll-mt-20">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        Skills
      </h2>

      <TagGroup items={site.skills} />

      {site.tools.length > 0 && (
        <>
          <h3 className="mt-8 mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Tools
          </h3>
          <TagGroup items={site.tools} />
        </>
      )}
    </section>
  );
}

function TagGroup({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-md border border-zinc-200 px-3.5 py-1.5 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

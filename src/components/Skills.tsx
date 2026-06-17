import { site } from "@/config/site";
import { TechTag } from "./TechTag";

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
        <li key={item}>
          <TechTag
            label={item}
            className="h-8 px-3.5 text-sm text-zinc-700 dark:text-zinc-300"
          />
        </li>
      ))}
    </ul>
  );
}

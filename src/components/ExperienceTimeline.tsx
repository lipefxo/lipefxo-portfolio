import type { CSSProperties, ReactNode } from "react";
import { resolveExperienceGroups } from "@/lib/projects";
import { TimelineProjects } from "./TimelineProjects";
import { TimelineScroller } from "./TimelineScroller";

export function ExperienceTimeline() {
  const groups = resolveExperienceGroups();

  return (
    <section
      id="experience"
      className="t-intro-item relative scroll-mt-20"
      style={{ "--intro-index": 4 } as CSSProperties}
    >
      <span id="work" className="absolute -top-20" aria-hidden="true" />

      <TimelineScroller>
        <ol aria-label="Experience and selected work">
        {groups.map(({ experience, roles }, groupIndex) => (
          <li key={experience.id}>
            {roles.map(({ role, projects }, roleIndex) => {
              const isLastRole = roleIndex === roles.length - 1;
              const isLastGroup = groupIndex === groups.length - 1;
              const paddingClass = isLastRole
                ? isLastGroup
                  ? "pb-2"
                  : "pb-14"
                : "pb-8 sm:pb-10";

              return (
                <TimelineSpine
                  key={`${experience.id}-${role.period}`}
                  as="article"
                  row
                  className={paddingClass}
                >
                  {roleIndex === 0 ? (
                    <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      <CompanyHeading
                        company={experience.company}
                        logo={experience.logo}
                        url={experience.url}
                      />
                    </h2>
                  ) : (
                    <h3 className="text-sm font-medium tracking-tight text-zinc-800 dark:text-zinc-200">
                      {role.title}
                    </h3>
                  )}

                  {roleIndex === 0 ? (
                    <h3 className="mt-1 text-sm font-medium tracking-tight text-zinc-800 dark:text-zinc-200">
                      {role.title}
                    </h3>
                  ) : null}

                  <p className="mt-1 text-[11px] leading-4 text-zinc-400 tabular-nums dark:text-zinc-600">
                    {role.period}
                  </p>

                  <p className="mt-3 max-w-[76ch] text-[13px] leading-6 text-zinc-600 dark:text-zinc-400">
                    {role.summary}
                  </p>

                  {projects.length > 0 ? (
                    <div className="mt-5">
                      <TimelineProjects projects={projects} />
                    </div>
                  ) : null}
                </TimelineSpine>
              );
            })}
          </li>
        ))}
        </ol>
      </TimelineScroller>
    </section>
  );
}

function TimelineSpine({
  as: Comp = "div",
  children,
  className = "",
  row = false,
}: {
  as?: "div" | "article";
  children: ReactNode;
  className?: string;
  row?: boolean;
}) {
  return (
    <Comp
      className={`relative ${className}`}
      {...(row ? { "data-timeline-row": "" } : {})}
    >
      <span
        data-timeline-anchor=""
        aria-hidden="true"
        className="absolute top-1.5 left-0 size-px opacity-0"
      />
      <div data-timeline-content="">{children}</div>
    </Comp>
  );
}

function CompanyHeading({
  company,
  logo,
  url,
}: {
  company: string;
  logo?: string;
  url?: string;
}) {
  const content = (
    <>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          width={20}
          height={20}
          className="t-company-mark size-5 object-cover"
        />
      ) : null}
      {company}
    </>
  );

  if (!url) {
    return <span className="inline-flex items-center gap-2">{content}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${company} website`}
      className="inline-flex items-center gap-2 rounded-[5px] no-underline transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
    >
      {content}
    </a>
  );
}

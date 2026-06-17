import type { CaseStudy } from "@/config/site";
import type { MouseEvent } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";

/** Project meta row: avatar stack, year (+ optional live link). */
export function CaseMeta({ meta }: { meta: CaseStudy["meta"] }) {
  return (
    <dl className="grid grid-cols-2 items-center gap-x-8 gap-y-6 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <div>
        <dt className="sr-only">Project team</dt>
        <dd
          className="t-avatar-group flex items-center -space-x-2"
          onMouseLeave={handleAvatarGroupLeave}
        >
          <span
            className="t-avatar relative z-10 inline-flex"
            onMouseEnter={(event) => handleAvatarEnter(event, 0)}
          >
            <ProfileAvatar
              size={26}
              tooltip={meta.role}
              className="ring-2 ring-white dark:ring-black"
            />
          </span>
          {meta.collaborators?.map((collaborator, index) => (
            <AnonymousAvatar
              key={`${collaborator.role}-${index}`}
              index={index}
              stackIndex={index + 1}
              tooltip={collaborator.role}
            />
          ))}
        </dd>
      </div>

      <div>
        <dt className="sr-only">Year</dt>
        <dd className="text-right text-sm text-zinc-800 dark:text-zinc-200">
          {meta.year}
        </dd>
      </div>

      {meta.liveUrl && (
        <div className="col-span-2 space-y-1.5">
          <dt className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Live
          </dt>
          <dd>
            <a
              href={meta.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
            >
              {meta.liveUrl.replace(/^https?:\/\//, "")}
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 7h10v10" />
                <path d="M7 17 17 7" />
              </svg>
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}

function AnonymousAvatar({
  index,
  stackIndex,
  tooltip,
}: {
  index: number;
  stackIndex: number;
  tooltip: string;
}) {
  const gradients = [
    "from-slate-300 via-zinc-100 to-zinc-500 dark:from-zinc-700 dark:via-zinc-500 dark:to-zinc-900",
    "from-emerald-300 via-teal-100 to-cyan-500 dark:from-emerald-800 dark:via-teal-600 dark:to-cyan-900",
    "from-amber-300 via-orange-100 to-rose-400 dark:from-amber-800 dark:via-orange-600 dark:to-rose-900",
  ];

  return (
    <span
      className="t-avatar group relative inline-flex shrink-0"
      onMouseEnter={(event) => handleAvatarEnter(event, stackIndex)}
    >
      <span
        className={`h-[26px] w-[26px] rounded-full bg-gradient-to-br ${gradients[index % gradients.length]} ring-2 ring-white dark:ring-black`}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2 scale-[0.98] whitespace-nowrap rounded-lg bg-[#222222] px-3 py-2 text-xs font-medium text-[#f0f0f0] opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_6px_0_rgba(0,0,0,0.05),0_4px_42px_0_rgba(0,0,0,0.06)] transition-[opacity,transform] duration-75 ease-out group-hover:scale-100 group-hover:opacity-100 group-hover:delay-[80ms] group-hover:duration-150"
        role="tooltip"
      >
        {tooltip}
      </span>
    </span>
  );
}

function handleAvatarEnter(event: MouseEvent<HTMLElement>, activeIndex: number) {
  const group = event.currentTarget.closest(".t-avatar-group");
  if (!(group instanceof HTMLElement)) return;
  updateAvatarMotion(group, activeIndex, true);
}

function handleAvatarGroupLeave(event: MouseEvent<HTMLElement>) {
  updateAvatarMotion(event.currentTarget, 0, false);
}

function updateAvatarMotion(
  group: HTMLElement,
  activeIndex: number,
  active: boolean,
) {
  const avatars = Array.from(group.querySelectorAll<HTMLElement>(".t-avatar"));
  const computed = getComputedStyle(group);
  const lift = parseFloat(computed.getPropertyValue("--avatar-lift")) || -4;
  const falloff =
    parseFloat(computed.getPropertyValue("--avatar-falloff")) || 0.45;

  avatars.forEach((avatar, index) => {
    avatar.style.transitionTimingFunction = active
      ? "var(--avatar-ease-in)"
      : "var(--avatar-ease-out)";
    avatar.style.setProperty(
      "--shift",
      active
        ? `${(lift * Math.pow(falloff, Math.abs(index - activeIndex))).toFixed(3)}px`
        : "0px",
    );
    avatar.style.setProperty(
      "--scale-active",
      active && index === activeIndex ? "var(--avatar-scale)" : "1",
    );
  });
}

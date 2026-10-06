import { site } from "@/config/site";
import type { ContributionCalendar } from "@/lib/github-contributions";

const colors = [
  "fill-zinc-100 dark:fill-zinc-900",
  "fill-[#c6dfcd] dark:fill-[#193d29]",
  "fill-[#8fbd9d] dark:fill-[#2e6240]",
  "fill-[#5e946e] dark:fill-[#4d915c]",
  "fill-[#356b45] dark:fill-[#80b88b]",
];

const monthFormat = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("en", {
  month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
});

export function GitHubContributions({ calendar }: { calendar: ContributionCalendar | null }) {
  const profileUrl = `https://github.com/${site.githubUser}`;
  const firstWeekday = calendar ? new Date(calendar.days[0].date).getUTCDay() : 0;
  const weeks = calendar ? Math.ceil((firstWeekday + calendar.days.length) / 7) : 0;
  const width = weeks * 14 - 4;
  const months: { label: string; week: number }[] = [];

  calendar?.days.forEach((day, index) => {
    const date = new Date(day.date);
    const week = Math.floor((firstWeekday + index) / 7);
    if ((index === 0 || date.getUTCDate() === 1) && week < weeks - 1) {
      // Avoid overlapping month labels when the first month is almost over.
      if (months.length && week - months[months.length - 1].week < 2) months.pop();
      months.push({ label: monthFormat.format(date), week });
    }
  });

  return (
    <section id="contributions" aria-labelledby="contributions-heading" className="max-w-[800px] space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="contributions-heading" className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {calendar ? (
            <>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {calendar.total.toLocaleString("en-US")} contributions
              </span>{" "}
              in the last year
            </>
          ) : "GitHub contributions"}
        </h2>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${site.githubUser}'s contributions on GitHub`}
          className="text-xs text-zinc-500 hover:text-zinc-900 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100"
        >
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>
      {calendar && (
        <div
          className="overflow-x-auto rounded-sm pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-500"
          tabIndex={0}
          role="region"
          aria-label="Contribution calendar, scroll horizontally on smaller screens"
        >
          <svg
            viewBox={`0 0 ${width} 118`}
            className="block w-full min-w-[560px]"
            role="img"
            aria-labelledby="contribution-calendar-title contribution-calendar-description"
          >
            <title id="contribution-calendar-title">{`GitHub contribution calendar for ${site.githubUser}`}</title>
            <desc id="contribution-calendar-description">
              {calendar.total.toLocaleString("en-US")} contributions from {dayFormat.format(new Date(calendar.days[0].date))} to {dayFormat.format(new Date(calendar.days.at(-1)!.date))}. Darker green in light mode and brighter green in dark mode indicate more contributions. Daily details are available on GitHub.
            </desc>
            <g className="fill-zinc-500 dark:fill-zinc-400" fontSize="10" aria-hidden="true">
              {months.map(({ label, week }) => (
                <text key={`${label}-${week}`} x={week * 14} y={10}>{label}</text>
              ))}
            </g>
            {calendar.days.map((day, index) => (
              <rect
                key={day.date}
                x={Math.floor((firstWeekday + index) / 7) * 14}
                y={24 + ((firstWeekday + index) % 7) * 14}
                width={10}
                height={10}
                rx={2}
                className={colors[day.level]}
              >
                <title>{`${day.count === 0 ? "No contributions" : `${day.count} contribution${day.count === 1 ? "" : "s"}`} on ${dayFormat.format(new Date(day.date))}`}</title>
              </rect>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

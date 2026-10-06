"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";
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
    <section id="contributions" aria-labelledby="contributions-heading">
      {calendar ? (
        <ContributionGraph
          calendar={calendar}
          firstWeekday={firstWeekday}
          width={width}
          months={months}
        />
      ) : (
        <h2 id="contributions-heading" className="text-xs font-normal text-zinc-500 dark:text-zinc-500">
          GitHub contributions
        </h2>
      )}
    </section>
  );
}

function ContributionGraph({
  calendar,
  firstWeekday,
  width,
  months,
}: {
  calendar: ContributionCalendar;
  firstWeekday: number;
  width: number;
  months: { label: string; week: number }[];
}) {
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const index = dayIndexAt(svg, event.clientX, event.clientY, firstWeekday, calendar.days.length);
    if (index === null) {
      setHover(null);
      return;
    }
    const origin = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    const point = cellOrigin(svg, index, firstWeekday);
    if (!origin || !point) return;
    setHover({ index, x: point.x - origin.left, y: point.y - origin.top });
  }

  const day = hover ? calendar.days[hover.index] : null;

  return (
    <div className="relative">
      <div
        className="overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-500"
        tabIndex={0}
        role="region"
        aria-label="Contribution calendar, scroll horizontally on smaller screens"
        onScroll={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${width} 118`}
          className="block w-full min-w-[560px] select-none"
          role="img"
          aria-labelledby="contribution-calendar-title contribution-calendar-description"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
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
          {calendar.days.map((entry, index) => {
            const active = hover?.index === index;
            return (
              <rect
                key={entry.date}
                x={Math.floor((firstWeekday + index) / 7) * 14}
                y={24 + ((firstWeekday + index) % 7) * 14}
                width={10}
                height={10}
                rx={2}
                className={`${colors[entry.level]} ${active ? "stroke-zinc-950 dark:stroke-zinc-100" : ""}`}
                strokeWidth={active ? 1 : 0}
              />
            );
          })}
        </svg>
      </div>
      {day && hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-lg bg-[#222222] px-3 py-2 text-xs font-medium text-[#f0f0f0] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_6px_0_rgba(0,0,0,0.05),0_4px_42px_0_rgba(0,0,0,0.06)]"
          style={{ left: hover.x, top: hover.y }}
        >
          {day.count === 0
            ? "No contributions"
            : `${day.count.toLocaleString("en-US")} contribution${day.count === 1 ? "" : "s"}`}
          <span className="font-normal text-[#a1a1a1]"> on {dayFormat.format(new Date(day.date))}</span>
        </div>
      )}
    </div>
  );
}

function dayIndexAt(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  firstWeekday: number,
  dayCount: number,
) {
  const local = svgPoint(svg, clientX, clientY);
  if (!local || local.y < 24) return null;
  const week = Math.floor(local.x / 14);
  const row = Math.floor((local.y - 24) / 14);
  if (week < 0 || row < 0 || row > 6) return null;
  if (local.x - week * 14 > 10 || local.y - 24 - row * 14 > 10) return null;
  const index = week * 7 + row - firstWeekday;
  if (index < 0 || index >= dayCount) return null;
  return index;
}

function cellOrigin(svg: SVGSVGElement, index: number, firstWeekday: number) {
  const week = Math.floor((firstWeekday + index) / 7);
  const row = (firstWeekday + index) % 7;
  return svgPoint(svg, week * 14 + 5, 24 + row * 14, true);
}

function svgPoint(svg: SVGSVGElement, x: number, y: number, toScreen = false) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;
  return toScreen ? point.matrixTransform(matrix) : point.matrixTransform(matrix.inverse());
}

"use client";

import { useMemo } from "react";
import { site } from "@/config/site";
import type { ContributionCalendar } from "@/lib/github-contributions";
import { HeatmapChart } from "@/components/charts/heatmap/heatmap-chart";
import { HeatmapCells } from "@/components/charts/heatmap/heatmap-cells";
import {
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  type HeatmapColumn,
} from "@/components/charts/heatmap/heatmap-context";
import { HeatmapTooltip } from "@/components/charts/heatmap/heatmap-tooltip";
import { HeatmapXAxis } from "@/components/charts/heatmap/heatmap-x-axis";

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function GitHubContributions({ calendar }: { calendar: ContributionCalendar | null }) {
  const { data, counts } = useMemo(() => {
    const data: HeatmapColumn[] = [];
    const counts = new Map<number, number>();

    calendar?.days.forEach((day, index) => {
      // Local dates keep Bklit's labels and tooltips on the correct day in every timezone.
      const date = new Date(`${day.date}T00:00:00`);
      const column = Math.floor(index / 7);
      data[column] ??= { bin: column, bins: [] };
      data[column].bins.push({
        bin: date.getDay(),
        date,
        // Use GitHub's relative intensity for the color scale;
        // retain actual contribution counts for tooltips.
        count: day.level,
      });
      counts.set(date.getTime(), day.count);
    });

    return { data, counts };
  }, [calendar]);

  return (
    <section id="contributions" aria-labelledby="contributions-heading">
      {calendar && data.length > 0 ? (
        <HeatmapInteractionProvider>
          <HeatmapInteractionBoundary>
            <p id="contribution-calendar-description" className="sr-only">
              {calendar.total.toLocaleString("en-US")} contributions from{" "}
              {dayFormat.format(data[0].bins[0].date)} to{" "}
              {dayFormat.format(data.at(-1)!.bins.at(-1)!.date)}. Stronger green
              indicates more contributions.
            </p>
            <div
              className="overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-500"
              tabIndex={0}
              role="region"
              aria-label="Contribution calendar, scroll horizontally on smaller screens"
              aria-describedby="contribution-calendar-description"
            >
              <HeatmapChart
                data={data}
                layout="fluid"
                className="min-w-[560px]"
                margin={{ top: 24, right: 0, bottom: 0, left: 0 }}
                gap={3}
                animationDuration={800}
              >
                <HeatmapCells cornerRadius={2} inactiveOpacity={0.5} hideGhostCells={false} />
                <HeatmapXAxis className="text-[10px]" />
                <HeatmapTooltip
                  portalToBody
                  className="[&_.border-b]:border-white/10"
                  panelStyle={{ borderColor: "rgb(255 255 255 / 0.1)" }}
                  formatLabel={(_, date) => {
                    const count = counts.get(date.getTime()) ?? 0;
                    return count === 0
                      ? "No contributions"
                      : `${count.toLocaleString("en-US")} contribution${count === 1 ? "" : "s"}`;
                  }}
                />
              </HeatmapChart>
            </div>
          </HeatmapInteractionBoundary>
        </HeatmapInteractionProvider>
      ) : (
        <h2 id="contributions-heading" className="text-xs font-normal text-zinc-500">
          <a href={`https://github.com/${site.githubUser}`} target="_blank" rel="noopener noreferrer">
            GitHub contributions
          </a>
        </h2>
      )}
    </section>
  );
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionCalendar {
  days: ContributionDay[];
  total: number;
}

/**
 * Read only the calendar GitHub exposes to signed-out visitors. Private activity
 * is included when the profile owner chooses to publicize its anonymous counts.
 * No token, repository contents, or third-party contribution service is needed.
 */
export async function getContributionCalendar(
  username: string,
): Promise<ContributionCalendar | null> {
  try {
    const response = await fetch(
      `https://github.com/users/${encodeURIComponent(username)}/contributions`,
      {
        headers: { Accept: "text/html", "Accept-Language": "en-US" },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) return null;
    return parseContributionCalendar(await response.text());
  } catch {
    return null;
  }
}

/** GitHub's public calendar is HTML; fail closed if its markup changes. */
export function parseContributionCalendar(html: string): ContributionCalendar | null {
  const counts = new Map<string, number>();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)) {
    const id = attribute(match[1], "for");
    const count = match[2].trim().match(/^(No|[\d,]+) contributions? on /);
    if (id && count) {
      counts.set(id, count[1] === "No" ? 0 : Number(count[1].replaceAll(",", "")));
    }
  }

  const days: ContributionDay[] = [];
  for (const match of html.matchAll(/<td\b([^>]*)>/g)) {
    const date = attribute(match[1], "data-date");
    if (!date) continue;
    const id = attribute(match[1], "id");
    const level = attribute(match[1], "data-level");
    const count = id ? counts.get(id) : undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !level || !/^[0-4]$/.test(level) || count === undefined) {
      return null;
    }
    days.push({ date, count, level: Number(level) as ContributionDay["level"] });
  }

  // A complete trailing year can contain a few extra days to align the weeks.
  // Reject partial responses instead of displaying misleading zero activity.
  if (days.length < 365 || days.length > 371) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));
  for (let index = 1; index < days.length; index++) {
    if (Date.parse(days[index].date) - Date.parse(days[index - 1].date) !== 86_400_000) {
      return null;
    }
  }

  return { days, total: days.reduce((sum, day) => sum + day.count, 0) };
}

function attribute(attributes: string, name: string): string | undefined {
  return attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
}

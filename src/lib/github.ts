import { site } from "@/config/site";

/** A normalized, serializable public repository. */
export interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  htmlUrl: string;
  homepage: string | null;
  pushedAt: string;
}

export interface GitHubCommit {
  repo: string;
  message: string;
  url: string;
  sha: string;
  date: string;
}

export interface GitHubActivityDay {
  date: string;
  count: number;
}

export interface GitHubActivity {
  days: GitHubActivityDay[];
  commits: GitHubCommit[];
}

/** Shape returned to the page: curated featured repos + the live feed. */
export interface RepoData {
  featured: Repo[];
  feed: Repo[];
  activity: GitHubActivity;
}

interface GitHubRepoResponse {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  homepage: string | null;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
}

interface GitHubEventResponse {
  type: string;
  created_at: string;
  repo: {
    name: string;
  };
  payload?: {
    commits?: {
      sha: string;
      message: string;
      url: string;
    }[];
  };
}

interface GitHubCommitResponse {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      date: string;
    } | null;
  };
}

const emptyActivity: GitHubActivity = {
  days: [],
  commits: [],
};

/**
 * Fetches the user's PUBLIC repos from GitHub, filters out forks/archived,
 * and splits them into curated featured repos and a live feed.
 *
 * Cached with ISR (revalidate hourly) to stay well under GitHub's
 * unauthenticated rate limit. Set GITHUB_TOKEN to raise the limit.
 * Never touches private/work repos — those live in `site.work`.
 */
export async function getRepos(): Promise<RepoData> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const [reposRes, eventsRes] = await Promise.all([
      fetch(
        `https://api.github.com/users/${site.githubUser}/repos?per_page=100&sort=pushed&type=owner`,
        { headers, next: { revalidate: 3600 } },
      ),
      fetch(
        `https://api.github.com/users/${site.githubUser}/events/public?per_page=100`,
        { headers, next: { revalidate: 3600 } },
      ),
    ]);

    if (!reposRes.ok) {
      return { featured: [], feed: [], activity: emptyActivity };
    }

    const raw: GitHubRepoResponse[] = await reposRes.json();
    const events: GitHubEventResponse[] = eventsRes.ok
      ? await eventsRes.json()
      : [];

    const repos: Repo[] = raw
      .filter(
        (r) =>
          !r.fork && !r.archived && !site.hiddenRepos.includes(r.name),
      )
      .map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        htmlUrl: r.html_url,
        homepage: r.homepage && r.homepage.trim() !== "" ? r.homepage : null,
        pushedAt: r.pushed_at,
      }));

    // Featured repos appear in the order they're listed in the config.
    const featuredNames = Object.keys(site.featured);
    const featured = featuredNames
      .map((name) => repos.find((r) => r.name === name))
      .filter((r): r is Repo => Boolean(r));

    const feed = repos
      .filter((r) => !featuredNames.includes(r.name))
      .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
    const latestCommits = await getLatestCommits([...featured, ...feed], headers);

    return { featured, feed, activity: getActivity(events, latestCommits) };
  } catch {
    return { featured: [], feed: [], activity: emptyActivity };
  }
}

async function getLatestCommits(
  repos: Repo[],
  headers: HeadersInit,
): Promise<GitHubCommit[]> {
  const commits = await Promise.all(
    repos.slice(0, 4).map(async (repo) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${site.githubUser}/${repo.name}/commits?per_page=1`,
          { headers, next: { revalidate: 3600 } },
        );

        if (!res.ok) return null;

        const [commit]: GitHubCommitResponse[] = await res.json();
        if (!commit) return null;

        return {
          repo: repo.name,
          message: commit.commit.message.split("\n")[0],
          url: commit.html_url,
          sha: commit.sha.slice(0, 7),
          date: commit.commit.author?.date ?? repo.pushedAt,
        };
      } catch {
        return null;
      }
    }),
  );

  return commits
    .filter((commit): commit is GitHubCommit => Boolean(commit))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getActivity(
  events: GitHubEventResponse[],
  latestCommits: GitHubCommit[],
): GitHubActivity {
  const visibleEvents = events.filter((event) => {
    const repo = event.repo.name.split("/").at(-1);
    return repo && !site.hiddenRepos.includes(repo);
  });

  const eventCommits = visibleEvents
    .filter((event) => event.type === "PushEvent")
    .flatMap((event) => {
      const repo = event.repo.name.split("/").at(-1) ?? event.repo.name;
      return (event.payload?.commits ?? []).map((commit) => ({
        repo,
        message: commit.message.split("\n")[0],
        url: commit.url.replace("api.github.com/repos", "github.com").replace("/commits/", "/commit/"),
        sha: commit.sha.slice(0, 7),
        date: event.created_at,
      }));
    })
    .slice(0, 4);

  return {
    days: getActivityDays(visibleEvents),
    commits: eventCommits.length > 0 ? eventCommits : latestCommits,
  };
}

function getActivityDays(events: GitHubEventResponse[]): GitHubActivityDay[] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.type !== "PushEvent") continue;
    const key = event.created_at.slice(0, 10);
    const count = event.payload?.commits?.length ?? 1;
    counts.set(key, (counts.get(key) ?? 0) + count);
  }

  return Array.from({ length: 84 }, (_, index) => {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - 83 + index);
    const date = day.toISOString().slice(0, 10);
    return {
      date,
      count: counts.get(date) ?? 0,
    };
  });
}

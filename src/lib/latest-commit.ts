import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { unstable_noStore as noStore } from "next/cache";
import { site } from "@/config/site";
import { fetchRepoCommit, type LatestCommit } from "@/lib/github";

const execFileAsync = promisify(execFile);
const PORTFOLIO_REPO = "lipefxo-portfolio";
const BINARY_FILE = /\.(png|jpe?g|webp|gif|ico|svg|woff2?|ttf|mp4|zip|pdf)$/i;

export type { LatestCommit };

/**
 * Latest commit for this portfolio: local git (including uncommitted work),
 * then this repo on GitHub. Never uses a random public event from another repo.
 */
export async function getLatestCommit(): Promise<LatestCommit | null> {
  noStore();

  const local = await getLatestCommitFromGit();
  if (local) return local;

  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return fetchRepoCommit(`${site.githubUser}/${PORTFOLIO_REPO}`, sha ?? "HEAD");
}

async function getLatestCommitFromGit(): Promise<LatestCommit | null> {
  try {
    const log = await git([
      "log",
      "-1",
      "--format=%H%x09%aI%x09%s",
    ]);
    const [sha, date, message] = log.split("\t");
    if (!sha || !date) return null;

    const remote = await git(["remote", "get-url", "origin"]).catch(() => "");
    const repoUrl = githubRepoUrl(remote) ?? `https://github.com/${site.githubUser}/${PORTFOLIO_REPO}`;
    const status = await git(["status", "--porcelain"]);
    const dirty = status.length > 0;

    const { additions, deletions } = dirty
      ? await workingTreeStats()
      : parseNumstat(await git(["show", "HEAD", "--numstat", "--format="]));

    const dirtyDate = dirty ? await latestDirtyDate(status, date) : date;

    return {
      repo: PORTFOLIO_REPO,
      message: message || "WIP",
      url: `${repoUrl}/commit/${sha}`,
      sha: sha.slice(0, 7),
      date: dirtyDate,
      additions,
      deletions,
    };
  } catch {
    return null;
  }
}

async function workingTreeStats() {
  const tracked = parseNumstat(
    await git(["diff", "HEAD", "--numstat"]).catch(() => ""),
  );
  const untracked = await untrackedAdditions();
  return {
    additions: tracked.additions + untracked,
    deletions: tracked.deletions,
  };
}

async function untrackedAdditions() {
  const listing = await git([
    "ls-files",
    "--others",
    "--exclude-standard",
  ]).catch(() => "");
  const files = listing.split("\n").filter((file) => file && !BINARY_FILE.test(file));
  let additions = 0;

  for (const file of files) {
    try {
      const contents = await readFile(file, "utf8");
      if (contents.includes("\u0000")) continue;
      additions += contents.split("\n").length;
    } catch {
      continue;
    }
  }

  return additions;
}

async function latestDirtyDate(status: string, fallback: string) {
  const files = status
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).split(" -> ").at(-1)?.trim())
    .filter((file): file is string => Boolean(file));

  let latest = 0;
  for (const file of files) {
    try {
      const info = await stat(file);
      latest = Math.max(latest, info.mtimeMs);
    } catch {
      continue;
    }
  }

  return latest > 0 ? new Date(latest).toISOString() : fallback;
}

function parseNumstat(output: string) {
  let additions = 0;
  let deletions = 0;

  for (const line of output.split("\n")) {
    const [added, removed] = line.split("\t");
    if (!added || added === "-") continue;
    additions += Number.parseInt(added, 10) || 0;
    deletions += Number.parseInt(removed, 10) || 0;
  }

  return { additions, deletions };
}

function githubRepoUrl(remote: string) {
  const ssh = remote.match(/^git@github\.com:(.+?)(?:\.git)?$/);
  if (ssh) return `https://github.com/${ssh[1]}`;
  const https = remote.match(/^https:\/\/github\.com\/(.+?)(?:\.git)?$/);
  if (https) return `https://github.com/${https[1]}`;
  return null;
}

async function git(args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: process.cwd(),
    timeout: 4000,
    maxBuffer: 2_000_000,
  });
  return stdout.trim();
}

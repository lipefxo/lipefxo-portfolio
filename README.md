# lipefxo — portfolio

A minimalist, single-page portfolio built with Next.js 16, React 19, Tailwind v4,
and TypeScript. It pulls public GitHub repositories live and showcases selected
private/work projects from hand-authored content.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Editing content

Almost everything you'll want to change lives in **`src/config/site.ts`**:

- `name`, `tagline`, `bio` — hero + about copy.
- `socials` — email, GitHub, X, LinkedIn (replace the LinkedIn placeholder URL).
- `skills` — the tags shown in the Skills section.
- `featured` — curated copy for public repos, keyed by repo name. Repos not listed
  here fall back to their GitHub description.
- `work` — private/work projects shown as description-only cards (no source links).

Search the file for `TODO: edit` to find placeholder copy.

### GitHub data

Public repos for the user in `site.githubUser` are fetched server-side and cached
hourly (ISR), so we stay under GitHub's unauthenticated rate limit. Forks and
archived repos are excluded. To raise the rate limit (optional), set a token in
`.env.local`:

```
GITHUB_TOKEN=ghp_xxx
```

Private/work repos are **never** fetched — their content is static in `site.ts`.

## Build & deploy

```bash
pnpm build   # production build (type-checks + lints data fetching)
```

Deploy to [Vercel](https://vercel.com/new) — it picks up the Next.js config
automatically. Add `GITHUB_TOKEN` as an environment variable if you set one.

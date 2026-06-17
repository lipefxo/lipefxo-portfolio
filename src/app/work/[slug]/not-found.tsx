import { TransitionLink } from "@/components/TransitionLink";

export default function WorkNotFound() {
  return (
    <div className="relative flex min-h-screen w-full flex-1 items-center justify-center bg-white px-6 dark:bg-black">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-xs tracking-wide text-zinc-400 dark:text-zinc-600">
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Project not found
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {"This case study doesn’t exist or has moved."}
        </p>
        <TransitionLink
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
        >
          Back to home
        </TransitionLink>
      </div>
    </div>
  );
}

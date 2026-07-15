"use client";

import { useAgentMode } from "./AgentModeContext";

export function AgentModeToggle({ className = "" }: { className?: string }) {
  const agentMode = useAgentMode();

  if (!agentMode) return null;

  return (
    <button
      type="button"
      onClick={agentMode.toggle}
      disabled={agentMode.transitioning}
      aria-pressed={agentMode.active}
      aria-label={
        agentMode.active
          ? "Return to visual portfolio"
          : "Switch to agent-readable Markdown view"
      }
      className={`inline-flex items-center justify-center text-zinc-500 transition-colors hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-wait disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-50 ${className}`}
    >
      <RobotIcon />
    </button>
  );
}

function RobotIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M12 3v4" />
      <path d="M9 3h6" />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <path d="M9 17h6" />
    </svg>
  );
}

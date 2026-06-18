/**
 * Decorative "typing indicator" ellipsis — three dots that pulse in a wave,
 * the way a chat client shows the other side is thinking. Placed after the
 * cycling "<action> <tool>" tokens, it separates the words from the tool and
 * keeps the line in motion. Purely presentational, so it's hidden from
 * assistive tech. The wave itself lives in `.t-typing-dots` (globals.css).
 */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={["t-typing-dots", className].filter(Boolean).join(" ")}
    >
      <span className="t-typing-dot" />
      <span className="t-typing-dot" />
      <span className="t-typing-dot" />
    </span>
  );
}

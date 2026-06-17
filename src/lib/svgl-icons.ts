export type SvglRoute = string | { light: string; dark: string };

export interface SvglIcon {
  title: string;
  route: SvglRoute;
}

const SVGL_ORIGIN = "https://svgl.app";

function svgl(path: string): string {
  return path.startsWith("http") ? path : `${SVGL_ORIGIN}${path}`;
}

function themed(light: string, dark: string): SvglRoute {
  return { light: svgl(light), dark: svgl(dark) };
}

function normalize(label: string): string {
  return label.trim().toLowerCase();
}

const ICONS = {
  apple: {
    title: "Apple",
    route: themed("/library/apple.svg", "/library/apple_dark.svg"),
  },
  auth0: { title: "Auth0", route: svgl("/library/auth0.svg") },
  "chakra ui": { title: "Chakra UI", route: svgl("/library/chakra-ui.svg") },
  "claude code": {
    title: "Claude AI",
    route: svgl("/library/claude-ai-icon.svg"),
  },
  clerk: {
    title: "Clerk",
    route: themed("/library/clerk-icon-light.svg", "/library/clerk-icon-dark.svg"),
  },
  clickup: { title: "ClickUp", route: svgl("/library/clickup.svg") },
  codex: {
    title: "Codex",
    route: themed("/library/codex_light.svg", "/library/codex_dark.svg"),
  },
  conductor: {
    title: "Conductor",
    route: themed("/library/conductor_light.svg", "/library/conductor_dark.svg"),
  },
  cursor: {
    title: "Cursor",
    route: themed("/library/cursor_light.svg", "/library/cursor_dark.svg"),
  },
  css: { title: "CSS", route: svgl("/library/css_old.svg") },
  docker: { title: "Docker", route: svgl("/library/docker.svg") },
  fastapi: { title: "FastAPI", route: svgl("/library/fastapi.svg") },
  figma: { title: "Figma", route: svgl("/library/figma.svg") },
  framer: {
    title: "Framer",
    route: themed("/library/framer.svg", "/library/framer_dark.svg"),
  },
  github: {
    title: "GitHub",
    route: themed("/library/github_light.svg", "/library/github_dark.svg"),
  },
  html5: { title: "HTML5", route: svgl("/library/html5.svg") },
  javascript: { title: "JavaScript", route: svgl("/library/javascript.svg") },
  linear: { title: "Linear", route: svgl("/library/linear.svg") },
  lovable: { title: "Lovable", route: svgl("/library/lovable.svg") },
  nextjs: { title: "Next.js", route: svgl("/library/nextjs_icon_dark.svg") },
  notion: { title: "Notion", route: svgl("/library/notion.svg") },
  paper: { title: "Paper", route: svgl("/library/paper.svg") },
  postgresql: { title: "PostgreSQL", route: svgl("/library/postgresql.svg") },
  posthog: { title: "PostHog", route: svgl("/library/posthog.svg") },
  python: { title: "Python", route: svgl("/library/python.svg") },
  "radix ui": {
    title: "Radix UI",
    route: themed("/library/radix-ui_light.svg", "/library/radix-ui_dark.svg"),
  },
  react: {
    title: "React",
    route: themed("/library/react_light.svg", "/library/react_dark.svg"),
  },
  "shadcn/ui": {
    title: "shadcn/ui",
    route: themed("/library/shadcn-ui.svg", "/library/shadcn-ui_dark.svg"),
  },
  slack: { title: "Slack", route: svgl("/library/slack.svg") },
  supabase: { title: "Supabase", route: svgl("/library/supabase.svg") },
  swift: { title: "Swift", route: svgl("/library/swift.svg") },
  "tailwind css": {
    title: "Tailwind CSS",
    route: svgl("/library/tailwindcss.svg"),
  },
  typescript: { title: "TypeScript", route: svgl("/library/typescript.svg") },
  v0: { title: "v0", route: themed("/library/v0_light.svg", "/library/v0_dark.svg") },
  vercel: {
    title: "Vercel",
    route: themed("/library/vercel.svg", "/library/vercel_dark.svg"),
  },
  "visual studio code": {
    title: "Visual Studio Code",
    route: svgl("/library/vscode.svg"),
  },
  webflow: { title: "Webflow", route: svgl("/library/webflow.svg") },
} satisfies Record<string, SvglIcon>;

const ALIASES: Record<string, keyof typeof ICONS> = {
  "claude ai": "claude code",
  html: "html5",
  macos: "apple",
  "next.js": "nextjs",
  "paper design": "paper",
  "swift 6": "swift",
  swiftdata: "swift",
  swiftui: "swift",
  "vs code": "visual studio code",
};

export function getSvglIcon(label: string): SvglIcon | undefined {
  const key = normalize(label);
  return ICONS[ALIASES[key] ?? key];
}

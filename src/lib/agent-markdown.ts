import { site, type CaseImage, type CaseStudy, type WorkProject } from "@/config/site";

function imageMarkdown(image: CaseImage) {
  if (!image.src) return `Image: ${image.alt ?? image.label}`;

  const alt = image.alt ?? image.label;
  return `![${alt}](${image.src})${image.caption ? `\n\n${image.caption}` : ""}`;
}

function caseStudyMarkdown(project: WorkProject, study: CaseStudy) {
  const lines = [
    `### ${project.name}`,
    "",
    project.longDescription,
    "",
    `#### ${study.headline}`,
    "",
    study.summary,
    "",
    `- Role: ${study.meta.role}`,
    `- Year: ${study.meta.year}`,
    `- Timeline: ${study.meta.timeline}`,
    `- Platform: ${study.meta.platform}`,
    `- Scope: ${study.meta.scope.join(", ")}`,
    ...(study.meta.collaborators?.length
      ? [`- Collaborators: ${study.meta.collaborators.map(({ role }) => role).join(", ")}`]
      : []),
    ...(study.meta.liveUrl ? [`- Live site: ${study.meta.liveUrl}`] : []),
    "",
    imageMarkdown(study.hero),
  ];

  if (study.git) {
    const stats = [
      study.git.prs && `${study.git.prs} merged PRs`,
      study.git.commits && `${study.git.commits} commits`,
      study.git.additions && `+${study.git.additions} lines`,
      study.git.deletions && `-${study.git.deletions} lines`,
      study.git.files && `${study.git.files} files`,
    ].filter(Boolean);
    if (stats.length) lines.push("", `Git activity: ${stats.join(" · ")}`);
  }

  lines.push("", `Tech: ${project.tech.join(", ")}`);

  if (study.stats?.length) {
    lines.push("", "#### Key results", "");
    lines.push(...study.stats.map(({ value, label }) => `- ${value} — ${label}`));
  }

  for (const section of study.sections) {
    if (section.heading) lines.push("", `#### ${section.heading}`, "");
    if (section.body?.length) lines.push(...section.body, "");
    if (section.images?.length) {
      lines.push(...section.images.flatMap((image) => [imageMarkdown(image), ""]));
    }
  }

  if (study.tldr?.length) {
    lines.push("#### Highlights", "", ...study.tldr.map((item) => `- ${item}`), "");
  }

  if (study.quote) {
    lines.push(
      "#### Reflection",
      "",
      `> ${study.quote.text}`,
      ...(study.quote.attribution ? [`> — ${study.quote.attribution}`] : []),
      "",
    );
  }

  if (study.outcome) {
    lines.push(`#### ${study.outcome.heading ?? "Outcome"}`, "", ...study.outcome.body, "");
  }

  return lines.join("\n").trim();
}

function projectMarkdown(project: WorkProject) {
  if (project.caseStudy) return caseStudyMarkdown(project, project.caseStudy);

  return [
    `### ${project.name}`,
    "",
    project.longDescription,
    "",
    `Tech: ${project.tech.join(", ")}`,
    ...(project.cover ? ["", imageMarkdown(project.cover)] : []),
  ].join("\n");
}

/**
 * A complete, static Markdown representation of the portfolio. It only reads
 * the same hand-authored configuration that powers the visible portfolio.
 */
export function getAgentMarkdown() {
  const publicWork = site.work.filter((project) => !project.locked);

  const lines = [
    `# ${site.name}`,
    "",
    site.tagline,
    "",
    `Location: ${site.location}`,
    "",
    "## Contact",
    "",
    `- Email: [${site.socials.email}](mailto:${site.socials.email})`,
    `- GitHub: https://github.com/${site.socials.github}`,
    `- X: https://x.com/${site.socials.x}`,
    `- LinkedIn: ${site.socials.linkedin}`,
    "",
    "## About",
    "",
    site.bio,
    "",
    "## Experience",
    "",
  ];

  for (const role of site.experience) {
    lines.push(
      `### ${role.company} — ${role.role}`,
      "",
      role.period,
      "",
      role.summary,
      "",
      ...role.highlights.map((highlight) => `- ${highlight}`),
      "",
    );
  }

  lines.push("## Skills", "", ...site.skills.map((skill) => `- ${skill}`), "", "## Tools", "", ...site.tools.map((tool) => `- ${tool}`), "", "## Currently", "");

  for (const category of site.currently) {
    lines.push(
      `### ${category.label}`,
      "",
      ...category.items.map((item) => `- ${item.title}${item.detail ? ` — ${item.detail}` : ""}`),
      "",
    );
  }

  lines.push("## Selected work", "", ...publicWork.flatMap((project) => [projectMarkdown(project), ""]));

  return lines.join("\n").trimEnd() + "\n";
}

"use client";

import { site } from "@/config/site";
import type { MouseEventHandler, ReactNode } from "react";
import CenterUnderline from "@/components/fancy/text/underline-center";
import { cn } from "@/lib/utils";

export const EMAIL_COPIED_EVENT = "lipefxo-email-copied";

type BaseSocialLink = {
  label: string;
  textLabel: string;
  tooltip: string;
  icon: ReactNode;
};

type ExternalSocialLink = BaseSocialLink & {
  href: string;
  download?: string;
};

type CopyEmailSocialLink = BaseSocialLink & {
  action: "copyEmail";
  value: string;
};

export type SocialLink = ExternalSocialLink | CopyEmailSocialLink;

export const socialLinks: SocialLink[] = [
  {
    label: "CV",
    textLabel: "cv",
    href: "/cv.docx",
    tooltip: "Download CV",
    download: "lipefxo-cv.docx",
    icon: <DownloadIcon />,
  },
  {
    label: "Email",
    textLabel: "e-mail",
    action: "copyEmail",
    value: site.socials.email,
    tooltip: "Copy",
    icon: <GmailIcon />,
  },
  {
    label: "GitHub",
    textLabel: "github",
    href: `https://github.com/${site.socials.github}`,
    tooltip: `@${site.socials.github}`,
    icon: <GitHubIcon />,
  },
  {
    label: "X",
    textLabel: "twitter(x)",
    href: `https://x.com/${site.socials.x}`,
    tooltip: `@${site.socials.x}`,
    icon: <XIcon />,
  },
  {
    label: "LinkedIn",
    textLabel: "linkedin",
    href: site.socials.linkedin,
    tooltip: "linkedin.com/in/felipefxo",
    icon: <LinkedInIcon />,
  },
];

export async function copyEmailToClipboard() {
  const email = site.socials.email;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(email);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = email;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  window.dispatchEvent(new CustomEvent(EMAIL_COPIED_EVENT));
}

export function SocialIconLinks({
  className,
}: {
  className?: string;
}) {
  const onCopyEmail: MouseEventHandler<HTMLButtonElement> = async () => {
    await copyEmailToClipboard();
  };

  return (
    <ul
      className={cn(
        "flex flex-wrap gap-4 text-zinc-500 dark:text-zinc-400",
        className,
      )}
    >
      {socialLinks.map((link) => (
        <li key={link.label}>
          {"action" in link ? (
            <CenterUnderline
              as="button"
              type="button"
              onClick={onCopyEmail}
              aria-label="Copy e-mail"
              className="text-[13px] font-medium transition-colors hover:text-zinc-950 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-100"
              underlineHeightRatio={0.08}
              underlinePaddingRatio={0.18}
            >
              {link.textLabel}
            </CenterUnderline>
          ) : (
            <CenterUnderline
              as="a"
              href={link.href}
              target={link.download ? undefined : "_blank"}
              rel={link.download ? undefined : "noopener noreferrer"}
              download={link.download}
              aria-label={link.label}
              className="text-[13px] font-medium no-underline transition-colors hover:text-zinc-950 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-100"
              underlineHeightRatio={0.08}
              underlinePaddingRatio={0.18}
            >
              {link.textLabel}
            </CenterUnderline>
          )}
        </li>
      ))}
    </ul>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.8 2H14L20 8V17.2C20 18.8802 20 19.7202 19.673 20.362C19.3854 20.9265 18.9265 21.3854 18.362 21.673C17.7202 22 16.8802 22 15.2 22H8.8C7.11984 22 6.27976 22 5.63803 21.673C5.07354 21.3854 4.6146 20.9265 4.32698 20.362C4 19.7202 4 18.8802 4 17.2V6.8C4 5.11984 4 4.27976 4.32698 3.63803C4.6146 3.07354 5.07354 2.6146 5.63803 2.32698C6.27976 2 7.11984 2 8.8 2Z"
        fill="currentColor"
        opacity="0.22"
      />
      <path
        d="M14 2.26953V6.40007C14 6.96012 14 7.24015 14.109 7.45406C14.2049 7.64222 14.3578 7.7952 14.546 7.89108C14.7599 8.00007 15.0399 8.00007 15.6 8.00007H19.7305M15 15L12 18L9 15M12 18V12M14 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H15.2C16.8802 22 17.7202 22 18.362 21.673C18.9265 21.3854 19.3854 20.9265 19.673 20.362C20 19.7202 20 18.8802 20 17.2V8L14 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 5.46v13.91c0 .9-.73 1.63-1.64 1.63h-3.82v-9.27L12 16.64l-6.55-4.91V21H1.64C.73 21 0 20.27 0 19.37V5.46c0-2.02 2.31-3.18 3.93-1.97l1.52 1.15L12 9.55l6.55-4.91 1.52-1.15C21.69 2.28 24 3.44 24 5.46Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.14c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.17 1.18A11 11 0 0 1 12 6.04c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.14c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM6.99 20.45H3.68V9h3.31v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0Z" />
    </svg>
  );
}

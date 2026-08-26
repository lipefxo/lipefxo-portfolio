import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NxtLevelLanding } from "./NxtLevelLanding";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-nxt-level",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lipefxolio.com"),
  title: "Nxt Level Recruiting Prototype",
  description:
    "A responsive landing-page prototype for Nxt Level Recruiting.",
  openGraph: {
    title: "Nxt Level Recruiting Prototype",
    description:
      "A responsive landing-page prototype for Nxt Level Recruiting.",
    type: "website",
    images: [
      {
        url: "/nxt-level-prototype/web-preview.png",
        width: 1512,
        height: 982,
        alt: "NXTLEVEL recruiting landing page preview with a sculptural chess knight.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nxt Level Recruiting Prototype",
    description:
      "A responsive landing-page prototype for Nxt Level Recruiting.",
    images: ["/nxt-level-prototype/web-preview.png"],
  },
};

export default function NxtLevelPrototypePage() {
  return (
    <div className={plusJakartaSans.variable}>
      <NxtLevelLanding />
    </div>
  );
}

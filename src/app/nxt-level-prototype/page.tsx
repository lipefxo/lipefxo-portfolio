import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NxtLevelLanding } from "./NxtLevelLanding";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-nxt-level",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nxt Level Recruiting Prototype",
  description:
    "A responsive landing-page prototype for Nxt Level Recruiting.",
};

export default function NxtLevelPrototypePage() {
  return (
    <div className={plusJakartaSans.variable}>
      <NxtLevelLanding />
    </div>
  );
}

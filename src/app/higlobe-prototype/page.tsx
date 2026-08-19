import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { HiglobePrototype } from "./HiglobePrototype";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-higlobe",
});

export const metadata: Metadata = {
  title: "Higlobe Prototype",
  description: "A responsive, interactive prototype for the Higlobe dashboard experience.",
};

export default function HiglobePrototypePage() {
  return (
    <div className={inter.variable}>
      <HiglobePrototype />
    </div>
  );
}

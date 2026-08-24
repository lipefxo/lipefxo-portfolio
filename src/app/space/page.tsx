import type { Metadata, Viewport } from "next";
import { SpaceExplorer } from "./SpaceExplorer";

export const metadata: Metadata = {
  title: {
    absolute: "Solar System Explorer",
  },
  description:
    "A living, pixel-art map of the solar system, viewed from an isometric perspective.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#02040b",
};

export default function SpacePage() {
  return <SpaceExplorer />;
}

import type { Metadata } from "next";
import TerrainExplorer from "./TerrainExplorer";

export const metadata: Metadata = {
  title: { absolute: "Terrain" },
  description: "An interactive site study of lot 75, from a survey drawing to a three-dimensional canvas.",
  robots: { index: false, follow: false },
};

export default function TerrainPage() {
  return <TerrainExplorer />;
}

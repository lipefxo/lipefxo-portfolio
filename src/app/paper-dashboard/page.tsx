import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PaperDashboard } from "./PaperDashboard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-paper",
});

export const metadata: Metadata = {
  title: "Higlobe Dashboard Motion Study",
  description: "A responsive, interactive dashboard motion study built from Paper.",
};

export default function PaperDashboardPage() {
  return (
    <div className={inter.variable}>
      <PaperDashboard />
    </div>
  );
}

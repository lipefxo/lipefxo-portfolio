import type { Metadata } from "next";
import { BtgInvestmentsPrototype } from "./BtgInvestmentsPrototype";

export const metadata: Metadata = {
  title: "BTG Pactual Investimentos — Protótipo",
  description:
    "Protótipo responsivo da experiência de investimentos do BTG Pactual.",
};

export default function BtgInvestmentsPrototypePage() {
  return <BtgInvestmentsPrototype />;
}

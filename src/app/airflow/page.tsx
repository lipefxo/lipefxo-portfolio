import type { Metadata } from "next";
import AirflowLab from "./AirflowLab";

export const metadata: Metadata = {
  title: { absolute: "B4 Airflow Lab" },
  description:
    "Explore component fit and compare fan configurations in a Lian Li B4-mATX Mesh.",
  robots: { index: false, follow: false },
};

export default function AirflowPage() {
  return <AirflowLab />;
}

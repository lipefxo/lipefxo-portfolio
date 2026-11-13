import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loteria Lab — O jogo, visto pelos dados",
  description:
    "Explore o histórico oficial da Mega-Sena, entenda padrões e gere combinações com critérios transparentes. Dados, não palpites.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

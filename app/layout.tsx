import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--f-display", display: "swap" });
const body = Jost({ subsets: ["latin"], variable: "--f-body", display: "swap" });

export const metadata: Metadata = {
  title: "ArqIA — IA para arquitetos",
  description: "Mapa de situação, moodboard, render, variações de luz e filme do projeto com IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

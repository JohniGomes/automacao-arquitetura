import "./globals.css";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--f-body", display: "swap" });

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

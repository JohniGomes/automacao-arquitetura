import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const body = Inter({ subsets: ["latin"], variable: "--f-body", display: "swap" });

export const metadata: Metadata = {
  title: "ArqIA — IA para arquitetos",
  description: "Mapa de situação, moodboard, render, variações de luz e filme do projeto com IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={body.variable}>
      <body>{children}</body>
    </html>
  );
}

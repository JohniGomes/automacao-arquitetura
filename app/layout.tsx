import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ArqIA — IA para arquitetos", description: "Mapa de situação, moodboard, render, luz e filme do projeto com IA." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR"><body>{children}</body></html>);
}

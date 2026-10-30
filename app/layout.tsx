import "./globals.css";
import "./rail.css";
import "./dark.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { getLang, getTheme } from "@/lib/i18n-server";

const body = Inter({ subsets: ["latin"], variable: "--f-body", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "ArqIA — AI for architects" : "ArqIA — IA para arquitetos",
    description: en
      ? "Site map, moodboard, render, lighting variations and project film with AI."
      : "Mapa de situação, moodboard, render, variações de luz e filme do projeto com IA.",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <html lang={lang === "en" ? "en" : "pt-BR"} data-theme={theme} className={body.variable}>
      <body><I18nProvider lang={lang}>{children}</I18nProvider></body>
    </html>
  );
}

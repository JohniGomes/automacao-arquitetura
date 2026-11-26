import "./tokens.css";
import "./globals.css";
import "./rail.css";
import "./croqui.css";
import "./ui.css";
import "./landing.css";
import "./dark.css";
import "./mobile.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { ToastProvider } from "@/components/Toast";
import { getLang, getTheme } from "@/lib/i18n-server";

const BRAND = "Croqui";
const body = Inter({ subsets: ["latin"], variable: "--f-body", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--f-display", display: "swap" });

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#0C0A0E" }, { media: "(prefers-color-scheme: dark)", color: "#0C0A0E" }],
};

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: "Croqui",
    applicationName: "Croqui",
    appleWebApp: { capable: true, title: BRAND, statusBarStyle: "default" },
    description: en
      ? "Site map, moodboard, render, lighting variations and descriptive memorial with AI."
      : "Mapa de situação, moodboard, render, variações de luz e memorial descritivo com IA.",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <html lang={lang === "en" ? "en" : "pt-BR"} data-theme={theme} className={`${body.variable} ${display.variable}`}>
      <body><I18nProvider lang={lang}><ToastProvider>{children}</ToastProvider></I18nProvider></body>
    </html>
  );
}

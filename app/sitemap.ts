import type { MetadataRoute } from "next";

const base = (process.env.APP_URL || "https://appcroqui.com.br").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/login", "/cadastro", "/termos", "/privacidade"].map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.5 }));
}

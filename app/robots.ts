import type { MetadataRoute } from "next";

const base = (process.env.APP_URL || "https://appcroqui.com.br").replace(/\/$/, "");

/** Buscadores podem ler a página pública; a área logada e a API ficam de fora. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/api", "/p/"] }], sitemap: `${base}/sitemap.xml` };
}

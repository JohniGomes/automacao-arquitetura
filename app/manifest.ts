import type { MetadataRoute } from "next";
import { emNatal } from "@/lib/natal";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Croqui",
    short_name: "Croqui",
    description: "Mapa de situação, moodboard, render, variações de luz e memorial descritivo com IA.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0C0A0E",
    theme_color: "#0C0A0E",
    lang: "pt-BR",
    icons: emNatal()
      ? [
          { src: "/icon-natal.svg", sizes: "any", type: "image/svg+xml" },
          { src: "/icons/natal-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/natal-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/natal-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ]
      : [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
  };
}

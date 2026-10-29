/** Registro das ferramentas (usado pela gaveta, pela busca da home e pelos atalhos). Seguro para o cliente. */
export type ToolId = "mapa" | "moodboard" | "render" | "luz" | "filme";
export type Tool = { id: ToolId; href: string; label: string; group: "Apresentação" | "Imagem"; icon: string; tone: number; hint: string };

export const TOOLS: Tool[] = [
  { id: "mapa", href: "/app/mapa", label: "Mapa de situação", group: "Apresentação", tone: 1, hint: "satélite entorno endereço localização",
    icon: "M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
  { id: "moodboard", href: "/app/moodboard", label: "Moodboard", group: "Apresentação", tone: 2, hint: "ambiente cores materiais referência cozinha sala banheiro quarto",
    icon: "M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z" },
  { id: "filme", href: "/app/filme", label: "Filme do projeto", group: "Apresentação", tone: 3, hint: "vídeo cenas animação mp4",
    icon: "M4 6h12v12H4zM16 10l5-3v10l-5-3" },
  { id: "render", href: "/app/render", label: "Render", group: "Imagem", tone: 4, hint: "fotorrealista modelo 3d print versões",
    icon: "M3 20h18M5 20V9l7-5 7 5v11M10 20v-6h4v6" },
  { id: "luz", href: "/app/luz", label: "Variação de luz", group: "Imagem", tone: 5, hint: "iluminação manhã golden hour noite blue hour",
    icon: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
];
export const GROUPS: Tool["group"][] = ["Apresentação", "Imagem"];
export const DEFAULT_PINS: ToolId[] = ["mapa", "render"];
export const toolById = (id: string) => TOOLS.find((t) => t.id === id);

export const TYPE_LABEL: Record<string, string> = { mapa: "Mapa de situação", moodboard: "Moodboard", render: "Render", luz: "Variação de luz", filme: "Filme" };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export function searchTools(q: string): Tool[] {
  const n = norm(q.trim());
  if (!n) return TOOLS;
  return TOOLS.filter((t) => norm(t.label + " " + t.hint + " " + t.group).includes(n));
}

/** Registro das ferramentas (usado pela gaveta, pela busca da home e pelos atalhos). Seguro para o cliente. */
export type ToolId = "mapa" | "moodboard" | "render" | "luz" | "filme" | "melhorar" | "esboco" | "ideias";
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
  { id: "melhorar", href: "/app/melhorar", label: "Melhorar render", group: "Imagem", tone: 2, hint: "refinar qualidade realismo premium fidelidade upscale",
    icon: "M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" },
  { id: "esboco", href: "/app/esboco", label: "Render de esboço", group: "Imagem", tone: 3, hint: "desenho traço croqui sketch à mão",
    icon: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" },
  { id: "ideias", href: "/app/ideias", label: "Gerar ideias", group: "Imagem", tone: 1, hint: "variações estilo fachada interior inspiração",
    icon: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" },
  { id: "luz", href: "/app/luz", label: "Variação de luz", group: "Imagem", tone: 5, hint: "iluminação manhã golden hour noite blue hour",
    icon: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
];
export const GROUPS: Tool["group"][] = ["Apresentação", "Imagem"];
export const DEFAULT_PINS: ToolId[] = ["mapa", "render"];
export const toolById = (id: string) => TOOLS.find((t) => t.id === id);

export const TYPE_LABEL: Record<string, string> = { mapa: "Mapa de situação", moodboard: "Moodboard", render: "Render", luz: "Variação de luz", filme: "Filme", melhorar: "Melhorar render", esboco: "Render de esboço", ideias: "Gerar ideias" };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export function searchTools(q: string): Tool[] {
  const n = norm(q.trim());
  if (!n) return TOOLS;
  return TOOLS.filter((t) => norm(t.label + " " + t.hint + " " + t.group).includes(n));
}

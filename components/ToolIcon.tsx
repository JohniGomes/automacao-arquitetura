import { Tool } from "@/lib/tools";

/** Ícone redondo e colorido de uma ferramenta (cores da paleta). */
export default function ToolIcon({ tool, size = 40 }: { tool: Tool; size?: number }) {
  return (
    <span className={`ticon tn-${tool.tone}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={tool.icon} /></svg>
    </span>
  );
}

import { Tool } from "@/lib/tools";
import Icon from "./icons";

/** Ícone arredondado de uma ferramenta, em cor chapada da paleta. */
export default function ToolIcon({ tool, size = 40 }: { tool: Tool; size?: number }) {
  return (
    <span className={`ticon tn-${tool.tone}`} style={{ width: size, height: size }}>
      <Icon name={tool.id} />
    </span>
  );
}

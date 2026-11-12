/** Conjunto de ícones do Croqui: traço fino de 1,6 px em duas camadas.
 *  "m" é o traço principal (cor do contexto); "a" é o detalhe em terracota (classe .ia). Grade de 24 px. */
export type IconName =
  | "home" | "folder" | "gallery" | "tools" | "user" | "support" | "help" | "lang" | "sun" | "moon" | "screen"
  | "mapa" | "moodboard" | "filme" | "render" | "melhorar" | "esboco" | "ideias" | "editor" | "angulos" | "luz";

const ICONS: Record<IconName, { main: string; acc?: string }> = {
  home: { main: "M3.5 11.2 12 4l8.5 7.2M6 9.8V20h12V9.8", acc: "M10 20v-5h4v5" },
  folder: { main: "M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z", acc: "M3.5 11.5h17" },
  gallery: { main: "M5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11A1.5 1.5 0 0 1 5.5 5z", acc: "M4.5 16.5 9 12l3.5 3.5 2.5-2.5 5 5" },
  tools: { main: "M12 3.5v3M12 6.5 6.5 20M12 6.5 17.5 20", acc: "M8.7 14.5h6.6" },
  user: { main: "M12 12a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6z", acc: "M4.5 20a7.5 7.5 0 0 1 15 0" },
  support: { main: "M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5.5A1.5 1.5 0 0 1 4 17.5zM20 14h-3v5h1.5a1.5 1.5 0 0 0 1.5-1.5z", acc: "M17 19c0 1.2-1.3 2-3 2h-2" },
  help: { main: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", acc: "M9.6 9.6a2.4 2.4 0 1 1 3.5 2.1c-.7.4-1.1.9-1.1 1.7M12 16.8h.01" },
  lang: { main: "M4 5h9M8.5 3v2M6 5c.6 3 2.7 5.6 5.5 7M12 5c-.6 3.2-3.4 6.4-7 8", acc: "M13 20l4-9 4 9M14.5 17h5" },
  sun: { main: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", acc: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" },
  moon: { main: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z", acc: "M16.5 4v3M15 5.5h3" },
  screen: { main: "M3.5 5h17v11h-17z", acc: "M8 20h8M12 16v4" },
  mapa: { main: "M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21z", acc: "M12 12.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" },
  moodboard: { main: "M4 4.5h7v8H4zM13 4.5h7v4.5h-7z", acc: "M13 11.5h7v8h-7zM4 15h7v4.5H4z" },
  filme: { main: "M4 6.5h11.5v11H4z", acc: "M15.5 10.5 20.5 7.5v9l-5-3" },
  render: { main: "M3.5 20.5h17M5.5 20.5V9.5L12 4.5l6.5 5v11", acc: "M12 11.5l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z" },
  melhorar: { main: "M10 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z", acc: "M18 15.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" },
  esboco: { main: "M4 20l.9-4.2L16.5 4.2a1.6 1.6 0 0 1 2.3 0l1 1a1.6 1.6 0 0 1 0 2.3L8.2 19.1z", acc: "M14.5 6.2l3.3 3.3" },
  ideias: { main: "M12 3.5a5.5 5.5 0 0 0-3.2 10c.6.5 1 1.1 1 1.9v.1h4.4v-.1c0-.8.4-1.4 1-1.9A5.5 5.5 0 0 0 12 3.5z", acc: "M10 18.5h4M10.8 21h2.4" },
  editor: { main: "M4.5 4.5h15v15h-15z", acc: "M8.5 15.5l5-5 2 2-5 5h-2z" },
  angulos: { main: "M3.5 12c0-2.2 3.8-4 8.5-4s8.5 1.8 8.5 4-3.8 4-8.5 4-8.5-1.8-8.5-4z", acc: "M12 8.5l3 1.7v3.6l-3 1.7-3-1.7v-3.6z" },
  luz: { main: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", acc: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" },
};

export default function Icon({ name }: { name: IconName }) {
  const i = ICONS[name];
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={i.main} />
      {i.acc && <path className="ia" d={i.acc} />}
    </svg>
  );
}

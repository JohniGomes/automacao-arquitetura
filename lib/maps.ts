import { env, mockMaps } from "./config";
import { mockSatellite } from "./mock";

export type Geo = { lat: number; lon: number; formatado: string; endereco: { logradouro?: string; bairro?: string; cidade?: string; uf?: string; cep?: string; numero?: string } };

function partes(comp: any[] = []): Geo["endereco"] {
  const pega = (t: string) => comp.find((c) => c.types?.includes(t));
  return {
    logradouro: pega("route")?.long_name, numero: pega("street_number")?.long_name,
    bairro: (pega("sublocality_level_1") || pega("sublocality") || pega("neighborhood"))?.long_name,
    cidade: pega("administrative_area_level_2")?.long_name, uf: pega("administrative_area_level_1")?.short_name, cep: pega("postal_code")?.long_name,
  };
}

/** Geocoding API: endereço → coordenada (e partes do endereço). A chave fica no servidor. */
export async function geocode(address: string): Promise<Geo | null> {
  if (mockMaps()) return { lat: -23.5614, lon: -46.6559, formatado: address, endereco: { logradouro: address.split(",")[0], cidade: "São Paulo", uf: "SP" } };
  const res = await fetch("https://maps.googleapis.com/maps/api/geocode/json?" + new URLSearchParams({ address, region: "br", language: "pt-BR", key: env.mapsKey }), { signal: AbortSignal.timeout(15_000) });
  const j = await res.json().catch(() => null);
  if (!j || (j.status !== "OK" && j.status !== "ZERO_RESULTS")) throw new Error(`Google Geocoding falhou: ${j?.status} ${j?.error_message || ""}`.slice(0, 200));
  const r = j.results?.[0];
  return r ? { lat: r.geometry.location.lat, lon: r.geometry.location.lng, formatado: r.formatted_address, endereco: partes(r.address_components) } : null;
}

/** Endereço do ponto (bairro, cidade, UF, CEP). Falha silenciosa: devolve vazio. */
export async function reverse(lat: number, lon: number): Promise<Geo["endereco"]> {
  if (mockMaps()) return { cidade: "São Paulo", uf: "SP" };
  try {
    const res = await fetch("https://maps.googleapis.com/maps/api/geocode/json?" + new URLSearchParams({ latlng: `${lat},${lon}`, language: "pt-BR", key: env.mapsKey }), { signal: AbortSignal.timeout(15_000) });
    const j = await res.json();
    return j.status === "OK" ? partes(j.results?.[0]?.address_components) : {};
  } catch { return {}; }
}

/** Static Maps API, maptype=satellite, 640x640 @2x = 1280x1280. Ref.: developers.google.com/maps/documentation/maps-static/start */
export async function satellite(address: string, zoom = 18): Promise<Buffer> {
  if (mockMaps()) return mockSatellite(address);
  const p = new URLSearchParams({
    center: address, zoom: String(Math.min(21, Math.max(1, zoom))), size: "640x640", scale: "2", maptype: "satellite", key: env.mapsKey,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${p}`);
  if (!res.ok || !(res.headers.get("content-type") || "").startsWith("image/")) {
    throw new Error(`Google Maps Static API falhou (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

import { env, mockMaps } from "./config";
import { mockSatellite } from "./mock";

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

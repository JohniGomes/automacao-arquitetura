/* Service worker do Croqui: só recebe notificações push e abre a tela certa ao tocar nelas. Não guarda nada em cache. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { titulo: "Croqui", texto: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.titulo || "Croqui", {
    body: d.texto || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: d.tag || undefined,
    data: { url: d.url || "/app/geracoes" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app/geracoes";
  event.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of abertas) {
      if ("focus" in c) { await c.focus(); if ("navigate" in c) { try { await c.navigate(url); } catch { /* ok */ } } return; }
    }
    await self.clients.openWindow(url);
  })());
});

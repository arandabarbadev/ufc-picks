// Punto de entrada: sesión, datos en vivo y navegación entre vistas.

import { auth, isConfigured } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { watchEvents, watchFights } from "./db.js";
import { resolvedRows } from "./stats.js";
import { initAuthUI } from "./auth.js";
import { renderEvents, renderEventDetail, renderHistory } from "./views.js";
import { renderDashboard } from "./dashboard.js";
import { toast } from "./ui.js";

// Registrar el service worker → permite "instalar" la app en el móvil
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

/* ── Estado global de la app ─────────────────────────── */

const store = {
  uid: null,
  events: [],                    // lista de eventos del usuario
  fightsByEvent: new Map(),      // eventId → array de peleas
  fightUnsubs: new Map(),        // eventId → función para dejar de escuchar
  eventsUnsub: null,
  get resolvedRows() {
    return resolvedRows(this.events, this.fightsByEvent);
  },
};

const $view = document.getElementById("view");
const $app = document.getElementById("app");
const $authScreen = document.getElementById("auth-screen");

/* ── Sesión ──────────────────────────────────────────── */

initAuthUI();

// Si Firebase no está configurado, la pantalla de login ya muestra el aviso
// y no tiene sentido escuchar la sesión.
if (isConfigured) onAuthStateChanged(auth, (user) => {
  if (user) {
    store.uid = user.uid;
    $authScreen.hidden = true;
    $app.hidden = false;
    document.getElementById("user-chip").textContent =
      user.displayName || user.email || "predictor";
    startData();
    if (!location.hash) location.hash = "#/dashboard";
    route();
  } else {
    stopData();
    store.uid = null;
    $app.hidden = true;
    $authScreen.hidden = false;
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  await signOut(auth);
  toast("Sesión cerrada. ¡Nos vemos en el próximo evento! 🥊");
});

/* ── Datos en vivo (Firestore) ───────────────────────── */

function startData() {
  if (store.eventsUnsub) return; // ya estaba escuchando
  store.eventsUnsub = watchEvents(store.uid, (events) => {
    store.events = events;
    // Escuchar las peleas de cada evento nuevo que aparezca
    for (const ev of events) {
      if (!store.fightUnsubs.has(ev.id)) {
        const unsub = watchFights(store.uid, ev.id, (fights) => {
          store.fightsByEvent.set(ev.id, fights);
          route(); // re-renderizar la vista actual con datos frescos
        });
        store.fightUnsubs.set(ev.id, unsub);
      }
    }
    route();
  });
}

function stopData() {
  store.eventsUnsub?.();
  store.eventsUnsub = null;
  for (const unsub of store.fightUnsubs.values()) unsub();
  store.fightUnsubs.clear();
  store.fightsByEvent.clear();
  store.events = [];
}

/* ── Navegación (hash router) ────────────────────────── */

const routes = ["dashboard", "events", "history"];

function route() {
  if (!store.uid) return;
  const hash = location.hash || "#/dashboard";
  const [, viewName, param] = hash.split("/"); // "#", nombre, id?

  // Resaltar la pestaña activa (el detalle de evento cuenta como "events")
  const navKey = viewName === "event" ? "events" : viewName;
  document.querySelectorAll(".nav-item").forEach((a) =>
    a.classList.toggle("active", a.dataset.route === navKey)
  );

  if (viewName === "events") renderEvents($view, store);
  else if (viewName === "event" && param) renderEventDetail($view, store, param);
  else if (viewName === "history") renderHistory($view, store);
  else renderDashboard($view, store);
}

window.addEventListener("hashchange", () => {
  route();
  window.scrollTo({ top: 0 }); // solo al navegar, no al refrescar datos
});

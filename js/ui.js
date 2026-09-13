// Utilidades de interfaz: escapado, avisos (toast), modales y fechas.

/** Escapa texto para insertarlo en HTML sin riesgo (nombres de peleadores, notas...). */
export function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Muestra un aviso flotante abajo. type: "ok" (verde) o undefined (rojo). */
export function toast(msg, type) {
  const root = document.getElementById("toast-root");
  const t = document.createElement("div");
  t.className = "toast" + (type === "ok" ? " ok" : "");
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/**
 * Abre una hoja modal con el HTML indicado.
 * Devuelve el elemento .modal (para enlazar eventos del formulario).
 * El modal se cierra tocando el fondo oscuro.
 */
export function openModal(html) {
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal"><div class="handle"></div>${html}</div>`;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  root.appendChild(overlay);
  return overlay.querySelector(".modal");
}

/** Cierra el modal abierto. */
export function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

/** Modal de confirmación con botones PELIGRO. Devuelve promesa true/false. */
export function confirmDialog(title, text, buttonLabel = "BORRAR") {
  return new Promise((resolve) => {
    const m = openModal(`
      <h2>${esc(title)}</h2>
      <p style="color:var(--ink-2);font-size:14px;margin:-6px 0 16px">${esc(text)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="no">CANCELAR</button>
        <button class="btn btn-danger" data-act="yes">${esc(buttonLabel)}</button>
      </div>
    `);
    m.querySelector('[data-act="no"]').onclick = () => { closeModal(); resolve(false); };
    m.querySelector('[data-act="yes"]').onclick = () => { closeModal(); resolve(true); };
  });
}

/** 5 estrellas de solo lectura para mostrar la confianza de un pick. */
export function starsReadonly(n) {
  const total = 5;
  return `<span class="stars-readonly" title="Confianza ${n}/5">${"★".repeat(n)}${"☆".repeat(total - n)}</span>`;
}

/** "2026-09-14" → "14 sept 2026" (español, sin depender de la zona horaria). */
export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]} ${y}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** Resumen del método: "KO/TKO · R2", "Sumisión · R1", "Decisión". */
export function methodText(method, round) {
  if (!method) return "";
  if (method === "Decisión" || round == null || round === "" || round === "-") return method;
  return `${method} · R${round}`;
}

/** Estado de un evento según su fecha. */
export function eventStatus(ev) {
  const today = todayStr();
  if (ev.date > today) return "upcoming";
  if (ev.date === today) return "today";
  return "past";
}

/** Octógono SVG para estados vacíos. */
export const OCTAGON_SVG = `
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M35 4 L65 4 L96 35 L96 65 L65 96 L35 96 L4 65 L4 35 Z"
          fill="none" stroke="currentColor" stroke-width="6"/>
  </svg>`;

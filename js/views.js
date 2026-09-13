// Vistas: lista de eventos, detalle de evento (peleas, picks y resultados)
// e historial con filtros.

import {
  addEvent, updateEvent, deleteEvent, addFight, addFights, deleteFight,
  savePick, deletePick, saveResult, deleteResult,
} from "./db.js";
import { WEIGHT_CLASSES, METHODS, ROUNDS, scoreFight, isResolved } from "./stats.js";
import { esc, toast, openModal, closeModal, confirmDialog, starsReadonly, fmtDate, todayStr, methodText, eventStatus, OCTAGON_SVG } from "./ui.js";

/* ══════════════ LISTA DE EVENTOS ══════════════ */

export function renderEvents(view, store) {
  const { events, fightsByEvent } = store;
  view.innerHTML = `
    <h2 class="view-title">EVENTOS</h2>
    <p class="view-sub">Crea un evento antes de cada cartelera y añade sus peleas.</p>
    <div id="events-list"></div>
    <button class="fab" id="fab-new-event" title="Nuevo evento" aria-label="Nuevo evento">+</button>
  `;

  const list = view.querySelector("#events-list");
  if (events.length === 0) {
    list.innerHTML = `
      <div class="empty">
        ${OCTAGON_SVG}
        <h3>AÚN NO HAY EVENTOS</h3>
        <p>Pulsa el botón + para crear tu primer evento UFC y empezar a pickear.</p>
      </div>`;
  } else {
    // Ordenar por fecha, los próximos primero
    const sorted = [...events].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    list.innerHTML = sorted.map((ev) => {
      const fights = fightsByEvent.get(ev.id) || [];
      const picks = fights.filter((f) => f.pick?.winner).length;
      const done = fights.filter((f) => isResolved(f)).length;
      const st = eventStatus(ev);
      const chip =
        st === "upcoming"
          ? `<span class="chip chip-upcoming">PRÓXIMO</span>`
          : st === "today"
          ? `<span class="chip chip-upcoming">HOY 🔥</span>`
          : `<span class="chip chip-past">PASADO</span>`;
      return `
        <a class="event-card" href="#/event/${ev.id}">
          <div class="row1">
            <div>
              <div class="name">${esc(ev.name)}</div>
              <div class="date">${fmtDate(ev.date)}</div>
            </div>
            ${chip}
          </div>
          <div class="meta">
            <span class="chip">${fights.length} PELEAS</span>
            <span class="chip">${picks} PICKS</span>
            ${done > 0 ? `<span class="chip">${done} RESUELTAS</span>` : ""}
          </div>
        </a>`;
    }).join("");
  }

  view.querySelector("#fab-new-event").onclick = () => openEventForm(store);
}

/* ══════════════ FORMULARIO DE EVENTO (crear/editar) ══════════════ */

export function openEventForm(store, ev = null) {
  const m = openModal(`
    <h2>${ev ? "EDITAR EVENTO" : "NUEVO EVENTO"}</h2>
    <div class="field">
      <span>NOMBRE DEL EVENTO</span>
      <input type="text" id="ev-name" maxlength="60" placeholder="Ej. UFC 305" value="${esc(ev?.name || "")}" />
    </div>
    <div class="field">
      <span>FECHA</span>
      <input type="date" id="ev-date" value="${esc(ev?.date || todayStr())}" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="ev-cancel">CANCELAR</button>
      <button class="btn btn-primary" id="ev-save">${ev ? "GUARDAR" : "CREAR"}</button>
    </div>
  `);

  m.querySelector("#ev-cancel").onclick = closeModal;
  m.querySelector("#ev-save").onclick = async () => {
    const name = m.querySelector("#ev-name").value.trim();
    const date = m.querySelector("#ev-date").value;
    if (!name) return toast("Ponle un nombre al evento (ej. UFC 305).");
    if (!date) return toast("Elige la fecha del evento.");
    const data = { name, date };
    if (ev) await updateEvent(store.uid, ev.id, data);
    else await addEvent(store.uid, data);
    closeModal();
    toast(ev ? "Evento actualizado." : "Evento creado. ¡Añade peleas! 🥊", "ok");
  };
}

/* ══════════════ DETALLE DE EVENTO ══════════════ */

export function renderEventDetail(view, store, eventId) {
  const ev = store.events.find((e) => e.id === eventId);
  if (!ev) {
    view.innerHTML = `<div class="empty"><h3>EVENTO NO ENCONTRADO</h3><p>Puede que lo hayan borrado.</p></div>`;
    return;
  }
  const fights = store.fightsByEvent.get(eventId) || [];
  const st = eventStatus(ev);

  const main = fights.filter((f) => f.card !== "preliminar");
  const prelim = fights.filter((f) => f.card === "preliminar");

  view.innerHTML = `
    <h2 class="view-title">${esc(ev.name)}</h2>
    <p class="view-sub">
      ${fmtDate(ev.date)}
      ${st === "upcoming" ? "· <span style='color:var(--chart-red)'>PRÓXIMO</span>" : st === "today" ? "· <span style='color:var(--chart-red)'>HOY 🔥</span>" : "· pasado"}
    </p>

    <div class="fight-actions" style="margin-bottom:16px">
      <button class="btn btn-ghost btn-sm" id="btn-edit-ev">EDITAR</button>
      <button class="btn btn-danger btn-sm" id="btn-del-ev">BORRAR EVENTO</button>
    </div>

    <h3 class="section-title">CARTELERA PRINCIPAL</h3>
    <div id="list-main"></div>
    <h3 class="section-title">PRELIMINARES</h3>
    <div id="list-prelim"></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-block" id="btn-add-fight">+ AÑADIR PELEA</button>
      <button class="btn btn-ghost btn-block" id="btn-add-bulk">+ AÑADIR VARIAS DE UNA VEZ</button>
    </div>
  `;

  paintFights(view.querySelector("#list-main"), store, ev, main);
  paintFights(view.querySelector("#list-prelim"), store, ev, prelim);

  view.querySelector("#btn-add-fight").onclick = () => openFightForm(store, ev);
  view.querySelector("#btn-add-bulk").onclick = () => openBulkFightForm(store, ev);
  view.querySelector("#btn-edit-ev").onclick = () => openEventForm(store, ev);
  view.querySelector("#btn-del-ev").onclick = async () => {
    if (await confirmDialog("¿Borrar evento?", `Se borrará "${ev.name}" con todas sus peleas, picks y resultados.`)) {
      await deleteEvent(store.uid, ev.id);
      toast("Evento borrado.");
      location.hash = "#/events";
    }
  };
}

function emptyFights() {
  return `<div class="empty" style="padding:18px">
    <p>Aún no hay peleas aquí. Añade la primera con el botón de abajo.</p>
  </div>`;
}

function paintFights(container, store, ev, fights) {
  if (!container) return;
  if (fights.length === 0) {
    container.innerHTML = emptyFights();
    return;
  }
  container.innerHTML = fights.map((f) => fightCardHTML(f)).join("");
  fights.forEach((f) => bindFightCard(container, store, ev, f));
}

/** Tarjeta de una pelea: peleadores, pick y resultado. */
function fightCardHTML(f) {
  const pick = f.pick;
  const result = f.result;
  const score = scoreFight(f);

  const pickSide = pick?.winner === "A" ? "A" : pick?.winner === "B" ? "B" : null;
  const resultSide = result?.winner === "A" ? "A" : result?.winner === "B" ? "B" : null;
  const nameA = `<span class="fname">${esc(f.fighterA)}</span>`;
  const nameB = `<span class="fname">${esc(f.fighterB)}</span>`;

  let pickHtml = "";
  if (pick?.winner) {
    const winnerName = pickSide === "A" ? f.fighterA : f.fighterB;
    pickHtml = `
      <div class="pick-summary">
        <div class="pick-line">
          <span style="font-weight:700;color:var(--ink)">TU PICK:</span>
          <span>${esc(winnerName)}</span>
          <span>·</span><span>${esc(methodText(pick.method, pick.round))}</span>
          ${starsReadonly(pick.confidence || 0)}
        </div>
        ${pick.note ? `<div class="note">“${esc(pick.note)}”</div>` : ""}
      </div>`;
  }

  let resultHtml = "";
  if (resultSide) {
    const realName = resultSide === "A" ? f.fighterA : f.fighterB;
    const hit = score?.winnerOk;
    resultHtml = `
      <div class="result-line">
        ${hit
          ? `<span class="chip chip-hit">✓ ACIERTO</span><span class="chip chip-pts">+${score.points} PTS</span>`
          : `<span class="chip chip-miss">✗ FALLO</span><span class="chip">0 PTS</span>`}
        <span style="color:var(--ink-3)">Real: <strong style="color:var(--ink-2)">${esc(realName)}</strong> por ${esc(methodText(result.method, result.round))}</span>
      </div>`;
  }

  const actions = [];
  if (!resultSide) {
    actions.push(pick?.winner
      ? `<button class="btn btn-ghost btn-sm" data-act="pick">EDITAR PICK</button>`
      : `<button class="btn btn-primary btn-sm" data-act="pick">HACER PICK</button>`);
    actions.push(`<button class="btn btn-ghost btn-sm" data-act="result">MARCAR RESULTADO</button>`);
  } else {
    actions.push(`<button class="btn btn-ghost btn-sm" data-act="result">EDITAR RESULTADO</button>`);
    if (pick?.winner) actions.push(`<button class="btn btn-danger btn-sm" data-act="clear-result">QUITAR RESULTADO</button>`);
  }
  if (pick?.winner && !resultSide) actions.push(`<button class="btn btn-ghost btn-sm" data-act="clear-pick">QUITAR PICK</button>`);
  actions.push(`<button class="btn btn-danger btn-sm" data-act="delete">✕</button>`);

  return `
    <div class="fight-card" data-fight="${f.id}">
      <div class="fighters">
        <div class="f A ${pickSide === "A" ? "picked" : ""}">${nameA}</div>
        <div class="vs">VS</div>
        <div class="f B ${pickSide === "B" ? "picked" : ""}">${nameB}</div>
      </div>
      <div class="tags">
        <span class="tag">${esc(f.weightClass || "Sin categoría")}</span>
        ${f.isTitle ? `<span class="tag" style="color:#f5c842;border-color:rgba(245,200,66,.4)">🏆 TÍTULO</span>` : ""}
        ${resultSide ? `<span class="tag" style="color:${resultSide === "A" ? "var(--chart-red)" : "var(--blue-corner)"}">GANÓ: ${esc(resultSide === "A" ? f.fighterA : f.fighterB)}</span>` : ""}
      </div>
      ${pickHtml}
      ${resultHtml}
      <div class="fight-actions">${actions.join("")}</div>
    </div>`;
}

function bindFightCard(container, store, ev, f) {
  const card = container.querySelector(`[data-fight="${f.id}"]`);
  if (!card) return;
  card.querySelectorAll("[data-act]").forEach((btn) => {
    const act = btn.dataset.act;
    if (act === "pick") btn.onclick = () => openPickForm(store, ev, f);
    if (act === "result") btn.onclick = () => openResultForm(store, ev, f);
    if (act === "clear-pick") btn.onclick = async () => {
      if (await confirmDialog("¿Quitar tu pick?", "Perderás la predicción de esta pelea.", "QUITAR")) {
        await deletePick(store.uid, ev.id, f.id);
      }
    };
    if (act === "clear-result") btn.onclick = async () => {
      if (await confirmDialog("¿Quitar el resultado?", "La pelea volverá a estar sin resolver.", "QUITAR")) {
        await deleteResult(store.uid, ev.id, f.id);
      }
    };
    if (act === "delete") btn.onclick = async () => {
      if (await confirmDialog("¿Borrar pelea?", `${f.fighterA} vs ${f.fighterB} se borrará con su pick y resultado.`)) {
        await deleteFight(store.uid, ev.id, f.id);
      }
    };
  });
}

/* ══════════════ FORMULARIO DE PELEA ══════════════ */

export function openFightForm(store, ev) {
  const m = openModal(`
    <h2>AÑADIR PELEA</h2>
    <div class="field">
      <span>PELEADOR A — ESQUINA ROJA</span>
      <input type="text" id="f-a" maxlength="60" placeholder="Ej. Israel Adesanya" />
    </div>
    <div class="field">
      <span>PELEADOR B — ESQUINA AZUL</span>
      <input type="text" id="f-b" maxlength="60" placeholder="Ej. Dricus Du Plessis" />
    </div>
    <div class="field">
      <span>CATEGORÍA DE PESO</span>
      <select id="f-wc">
        ${WEIGHT_CLASSES.map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")}
      </select>
    </div>
    <div class="field">
      <span>LOGRO EN JUEGO</span>
      <select id="f-title">
        <option value="no">Pelea normal</option>
        <option value="yes">🏆 Pelea por el título</option>
      </select>
    </div>
    <div class="field">
      <span>CARTELERA</span>
      <div class="segmented" id="f-card">
        <button type="button" data-v="principal" class="sel">PRINCIPAL</button>
        <button type="button" data-v="preliminar">PRELIMINAR</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="f-cancel">CANCELAR</button>
      <button class="btn btn-primary" id="f-save">AÑADIR</button>
    </div>
  `);

  const segCard = m.querySelector("#f-card");
  segCard.querySelectorAll("button").forEach((b) =>
    b.onclick = () => {
      segCard.querySelectorAll("button").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
    }
  );

  m.querySelector("#f-cancel").onclick = closeModal;
  m.querySelector("#f-save").onclick = async () => {
    const a = m.querySelector("#f-a").value.trim();
    const b = m.querySelector("#f-b").value.trim();
    if (!a || !b) return toast("Escribe el nombre de los dos peleadores.");
    if (a.toLowerCase() === b.toLowerCase()) return toast("Los dos peleadores no pueden llamarse igual 😅");
    await addFight(store.uid, ev.id, {
      fighterA: a,
      fighterB: b,
      weightClass: m.querySelector("#f-wc").value,
      isTitle: m.querySelector("#f-title").value === "yes",
      card: segCard.querySelector(".sel").dataset.v,
      pick: null,
      result: null,
    });
    closeModal();
    toast("Pelea añadida. ¡Haz tu pick! 🥊", "ok");
  };
}

/* ══════════════ AÑADIR VARIAS PELEAS DE UNA VEZ ══════════════ */

// Quita mayúsculas y acentos para comparar ("Wélter" == "welter")
const norm = (s) => s.toLowerCase().normalize("NFD").replace(new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g"), ""); // 0x300-0x36F = rango de acentos

// Nombres en inglés que aparecen al copiar carteleras de webs en inglés
const PESOS_EN = {
  "light heavyweight": "Semipesado",
  lightheavyweight: "Semipesado",
  heavyweight: "Peso pesado",
  middleweight: "Peso mediano",
  welterweight: "Peso wélter",
  lightweight: "Peso ligero",
  featherweight: "Peso pluma",
  bantamweight: "Peso gallo",
  flyweight: "Peso mosca",
  "women's strawweight": "Peso paja femenino",
  "women's bantamweight": "Peso gallo femenino",
  "women's flyweight": "Peso mosca femenino",
  strawweight: "Peso paja femenino",
  catchweight: "Catchweight",
};

/** Detecta la categoría de peso en el texto extra (español o inglés). */
function detectWeight(extras) {
  const x = norm(extras);
  for (const [en, es] of Object.entries(PESOS_EN).sort((a, b) => b[0].length - a[0].length)) {
    if (x.includes(norm(en))) return es;
  }
  for (const wc of WEIGHT_CLASSES) if (x.includes(norm(wc))) return wc; // nombre completo
  for (const wc of WEIGHT_CLASSES) if (x.includes(norm(wc.replace(/^Peso /, "")))) return wc; // corto: "mediano", "welter"...
  return "";
}

/**
 * Interpreta una línea del tipo:
 *   "Peleador A vs Peleador B | mediano | titulo | preliminar"
 * (todo lo que va tras "|" es opcional). Devuelve { ok, fight, error }.
 */
function parseFightLine(line) {
  const partes = line.split("|");
  const m = partes[0].match(/^(.+?)\s+(?:vs\.?|v)\s+(.+)$/i);
  if (!m) return { ok: false, error: "no veo el formato Peleador A vs Peleador B" };
  const fighterA = m[1].trim().slice(0, 60);
  const fighterB = m[2].trim().slice(0, 60);
  if (!fighterA || !fighterB) return { ok: false, error: "falta el nombre de un peleador" };

  const extras = norm(partes.slice(1).join(" "));
  return {
    ok: true,
    fight: {
      fighterA,
      fighterB,
      weightClass: detectWeight(extras),
      isTitle: /titul|title|camp|cinturon|belt/.test(extras),
      card: /prelim/.test(extras) ? "preliminar" : "principal",
      pick: null,
      result: null,
    },
  };
}

export function openBulkFightForm(store, ev) {
  const m = openModal(`
    <h2>AÑADIR VARIAS PELEAS</h2>
    <p style="color:var(--ink-3);font-size:13px;margin:-8px 0 14px">
      Pega la cartelera con <strong>una pelea por línea</strong>. El formato es
      <em>Peleador A vs Peleador B | peso | titulo | preliminar</em> — todo lo que va
      tras "|" es opcional (el peso también vale en inglés: middleweight, flyweight…).
    </p>
    <div class="field">
      <span>PELEAS (UNA POR LÍNEA)</span>
      <textarea id="bk-text" rows="9" placeholder="Israel Adesanya vs Dricus Du Plessis | mediano | titulo
Kai Kara-France vs Steve Erceg | flyweight
Jaqueline Amorim vs Polyana Viana | paja femenino | preliminar"></textarea>
    </div>
    <div class="field">
      <span>VISTA PREVIA</span>
      <div id="bk-preview" style="font-size:13px;color:var(--ink-2)">Escribe arriba y aquí verás cómo quedan las peleas.</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="bk-cancel">CANCELAR</button>
      <button class="btn btn-primary" id="bk-save" disabled>AÑADIR</button>
    </div>
  `);

  const ta = m.querySelector("#bk-text");
  const preview = m.querySelector("#bk-preview");
  const btnSave = m.querySelector("#bk-save");
  let buenas = [];

  function refrescar() {
    const lineas = ta.value.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30);
    buenas = [];
    const filas = lineas.map((linea, i) => {
      const r = parseFightLine(linea);
      if (!r.ok) {
        return `<div style="padding:5px 0;color:#e66767">✗ Línea ${i + 1}: ${esc(r.error)}</div>`;
      }
      buenas.push(r.fight);
      const f = r.fight;
      return `<div style="padding:5px 0">
        ✓ ${esc(f.fighterA)} <span style="color:var(--ink-3)">vs</span> ${esc(f.fighterB)}
        <span style="color:var(--ink-3)">· ${esc(f.weightClass || "sin categoría")}
        · ${f.card === "preliminar" ? "preliminar" : "principal"}${f.isTitle ? " · 🏆" : ""}</span>
      </div>`;
    });
    preview.innerHTML = lineas.length === 0
      ? "Escribe arriba y aquí verás cómo quedan las peleas."
      : filas.join("") + `<div style="margin-top:8px;color:var(--ink-3)">${buenas.length} de ${lineas.length} listas para añadir</div>`;
    btnSave.disabled = buenas.length === 0;
    btnSave.textContent = buenas.length > 0 ? `AÑADIR ${buenas.length} PELEAS` : "AÑADIR";
  }

  ta.addEventListener("input", refrescar);
  m.querySelector("#bk-cancel").onclick = closeModal;
  btnSave.onclick = async () => {
    btnSave.disabled = true;
    try {
      await addFights(store.uid, ev.id, buenas);
      closeModal();
      toast(`${buenas.length} peleas añadidas. ¡A pickear! 🥊`, "ok");
    } catch (e) {
      toast("No se pudieron guardar: " + (e?.code || e?.message));
      btnSave.disabled = false;
    }
  };
}

export function openPickForm(store, ev, f) {
  const p = f.pick || {};
  const m = openModal(`
    <h2>TU PICK</h2>
    <p style="color:var(--ink-3);font-size:13px;margin:-8px 0 14px">${esc(f.fighterA)} vs ${esc(f.fighterB)} · ${esc(f.weightClass || "")}</p>

    <div class="field">
      <span>¿QUIÉN GANA?</span>
      <div class="fighter-pick">
        <button type="button" class="corner-btn" data-side="A" data-k="winner">
          <span class="corner-tag">ESQUINA ROJA</span>
          <span class="fname">${esc(f.fighterA)}</span>
        </button>
        <div class="vs">VS</div>
        <button type="button" class="corner-btn" data-side="B" data-k="winner">
          <span class="corner-tag">ESQUINA AZUL</span>
          <span class="fname">${esc(f.fighterB)}</span>
        </button>
      </div>
    </div>

    <div class="field">
      <span>MÉTODO DE VICTORIA</span>
      <div class="segmented" id="pk-method">
        ${METHODS.map((x) => `<button type="button" data-v="${esc(x)}" class="${p.method === x ? "sel" : ""}">${esc(x).toUpperCase()}</button>`).join("")}
      </div>
    </div>

    <div class="field">
      <span>ROUND</span>
      <div class="segmented" id="pk-round">
        <button type="button" data-v="-" class="${!p.round || p.round === "-" ? "sel" : ""}">—</button>
        ${ROUNDS.map((r) => `<button type="button" data-v="${r}" class="${String(p.round) === r ? "sel" : ""}">R${r}</button>`).join("")}
      </div>
      <p class="hint">Si eliges Decisión, el round no se tiene en cuenta.</p>
    </div>

    <div class="field">
      <span>CONFIANZA</span>
      <div class="stars" id="pk-stars">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}" class="${(p.confidence || 0) >= n ? "on" : ""}">★</button>`).join("")}
      </div>
    </div>

    <div class="field">
      <span>NOTA TÁCTICA (OPCIONAL)</span>
      <textarea id="pk-note" maxlength="300" placeholder="¿Por qué va a ganar? Ej: mejor alcance y defense de wrestling...">${esc(p.note || "")}</textarea>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" id="pk-cancel">CANCELAR</button>
      <button class="btn btn-primary" id="pk-save">GUARDAR PICK</button>
    </div>
  `);

  const state = { winner: p.winner || null, method: p.method || null, round: p.round ?? "-", confidence: p.confidence || 0 };

  // Ganador
  m.querySelectorAll('[data-k="winner"]').forEach((b) =>
    b.onclick = () => {
      state.winner = b.dataset.side;
      m.querySelectorAll('[data-k="winner"]').forEach((x) => x.classList.toggle("sel", x === b));
    }
  );
  if (state.winner) m.querySelector(`[data-k="winner"][data-side="${state.winner}"]`)?.classList.add("sel");

  // Método
  const segMethod = m.querySelector("#pk-method");
  const segRound = m.querySelector("#pk-round");
  function syncRound() {
    const isDec = state.method === "Decisión";
    segRound.querySelectorAll("button").forEach((b) => (b.disabled = isDec && b.dataset.v !== "-"));
    if (isDec) {
      state.round = "-";
      segRound.querySelectorAll("button").forEach((b) => b.classList.toggle("sel", b.dataset.v === "-"));
    }
  }
  segMethod.querySelectorAll("button").forEach((b) =>
    b.onclick = () => {
      state.method = b.dataset.v;
      segMethod.querySelectorAll("button").forEach((x) => x.classList.toggle("sel", x === b));
      syncRound();
    }
  );
  segRound.querySelectorAll("button").forEach((b) =>
    b.onclick = () => {
      if (b.disabled) return;
      state.round = b.dataset.v;
      segRound.querySelectorAll("button").forEach((x) => x.classList.toggle("sel", x === b));
    }
  );
  syncRound();

  // Estrellas
  const starsBox = m.querySelector("#pk-stars");
  starsBox.querySelectorAll("button").forEach((b) =>
    b.onclick = () => {
      const v = Number(b.dataset.v);
      state.confidence = state.confidence === v ? v - 1 : v; // pulsar la última estrella la quita
      starsBox.querySelectorAll("button").forEach((x) => x.classList.toggle("on", Number(x.dataset.v) <= state.confidence));
    }
  );

  m.querySelector("#pk-cancel").onclick = closeModal;
  m.querySelector("#pk-save").onclick = async () => {
    if (!state.winner) return toast("Elige quién crees que gana.");
    if (!state.method) return toast("Elige el método de victoria.");
    await savePick(store.uid, ev.id, f.id, {
      winner: state.winner,
      method: state.method,
      round: state.round,
      confidence: state.confidence,
      note: m.querySelector("#pk-note").value.trim(),
    });
    closeModal();
    toast("Pick guardado 💪", "ok");
  };
}

/* ══════════════ FORMULARIO DE RESULTADO ══════════════ */

export function openResultForm(store, ev, f) {
  const r = f.result || {};
  const m = openModal(`
    <h2>RESULTADO REAL</h2>
    <p style="color:var(--ink-3);font-size:13px;margin:-8px 0 14px">${esc(f.fighterA)} vs ${esc(f.fighterB)} · ${esc(f.weightClass || "")}</p>

    <div class="field">
      <span>¿QUIÉN GANÓ?</span>
      <div class="fighter-pick">
        <button type="button" class="corner-btn" data-side="A" data-k="winner">
          <span class="corner-tag">ESQUINA ROJA</span>
          <span class="fname">${esc(f.fighterA)}</span>
        </button>
        <div class="vs">VS</div>
        <button type="button" class="corner-btn" data-side="B" data-k="winner">
          <span class="corner-tag">ESQUINA AZUL</span>
          <span class="fname">${esc(f.fighterB)}</span>
        </button>
      </div>
    </div>

    <div class="field">
      <span>MÉTODO DE VICTORIA</span>
      <div class="segmented" id="rs-method">
        ${METHODS.map((x) => `<button type="button" data-v="${esc(x)}" class="${r.method === x ? "sel" : ""}">${esc(x).toUpperCase()}</button>`).join("")}
      </div>
    </div>

    <div class="field">
      <span>ROUND</span>
      <div class="segmented" id="rs-round">
        <button type="button" data-v="-" class="${!r.round || r.round === "-" ? "sel" : ""}">—</button>
        ${ROUNDS.map((n) => `<button type="button" data-v="${n}" class="${String(r.round) === n ? "sel" : ""}">R${n}</button>`).join("")}
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" id="rs-cancel">CANCELAR</button>
      <button class="btn btn-primary" id="rs-save">GUARDAR RESULTADO</button>
    </div>
  `);

  const state = { winner: r.winner || null, method: r.method || null, round: r.round ?? "-" };

  m.querySelectorAll('[data-k="winner"]').forEach((b) =>
    b.onclick = () => {
      state.winner = b.dataset.side;
      m.querySelectorAll('[data-k="winner"]').forEach((x) => x.classList.toggle("sel", x === b));
    }
  );
  if (state.winner) m.querySelector(`[data-k="winner"][data-side="${state.winner}"]`)?.classList.add("sel");

  const segMethod = m.querySelector("#rs-method");
  const segRound = m.querySelector("#rs-round");
  function syncRound() {
    const isDec = state.method === "Decisión";
    segRound.querySelectorAll("button").forEach((b) => (b.disabled = isDec && b.dataset.v !== "-"));
    if (isDec) {
      state.round = "-";
      segRound.querySelectorAll("button").forEach((b) => b.classList.toggle("sel", b.dataset.v === "-"));
    }
  }
  segMethod.querySelectorAll("button").forEach((b) =>
    b.onclick = () => {
      state.method = b.dataset.v;
      segMethod.querySelectorAll("button").forEach((x) => x.classList.toggle("sel", x === b));
      syncRound();
    }
  );
  segRound.querySelectorAll("button").forEach((b) =>
    b.onclick = () => {
      if (b.disabled) return;
      state.round = b.dataset.v;
      segRound.querySelectorAll("button").forEach((x) => x.classList.toggle("sel", x === b));
    }
  );
  syncRound();

  m.querySelector("#rs-cancel").onclick = closeModal;
  m.querySelector("#rs-save").onclick = async () => {
    if (!state.winner) return toast("Marca quién ganó de verdad.");
    if (!state.method) return toast("Marca el método de victoria real.");
    await saveResult(store.uid, ev.id, f.id, {
      winner: state.winner,
      method: state.method,
      round: state.round,
    });
    closeModal();
    // Aviso de si acertó al guardar el resultado
    const score = scoreFight({ pick: f.pick, result: { winner: state.winner, method: state.method, round: state.round } });
    if (f.pick?.winner && score) {
      toast(score.winnerOk ? `¡ACERTASTE! +${score.points} pts 🎯` : "Fallo... el octágono perdona poco 😤", score.winnerOk ? "ok" : undefined);
    } else {
      toast("Resultado guardado (marcaste el resultado sin pick).", "ok");
    }
  };
}

/* ══════════════ HISTORIAL ══════════════ */

export function renderHistory(view, store) {
  const rowsAll = store.resolvedRows;

  // Filtros disponibles según los datos
  const years = [...new Set(rowsAll.map((r) => (r.event.date || "").slice(0, 4)).filter(Boolean))].sort().reverse();
  const weights = [...new Set(rowsAll.map((r) => r.fight.weightClass || "Sin categoría"))].sort();

  view.innerHTML = `
    <h2 class="view-title">HISTORIAL</h2>
    <p class="view-sub">Tus picks frente a los resultados reales, evento a evento.</p>
    <div class="filter-row">
      <select id="hf-year"><option value="">Todos los años</option>${years.map((y) => `<option value="${y}">${y}</option>`).join("")}</select>
      <select id="hf-weight"><option value="">Todos los pesos</option>${weights.map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")}</select>
    </div>
    <div id="hist-list"></div>
  `;

  const yearSel = view.querySelector("#hf-year");
  const weightSel = view.querySelector("#hf-weight");
  const list = view.querySelector("#hist-list");

  function paint() {
    const year = yearSel.value;
    const weight = weightSel.value;
    let rows = rowsAll;
    if (year) rows = rows.filter((r) => (r.event.date || "").startsWith(year));
    if (weight) rows = rows.filter((r) => (r.fight.weightClass || "Sin categoría") === weight);

    if (rows.length === 0) {
      list.innerHTML = `
        <div class="empty">
          ${OCTAGON_SVG}
          <h3>NADA POR AQUÍ</h3>
          <p>Cuando marques resultados de peleas con pick, aparecerán en este historial.</p>
        </div>`;
      return;
    }

    // Agrupar por evento (orden cronológico inverso: lo más reciente arriba)
    const byEvent = new Map();
    for (const r of rows) {
      if (!byEvent.has(r.event.id)) byEvent.set(r.event.id, { ev: r.event, rows: [] });
      byEvent.get(r.event.id).rows.push(r);
    }
    const groups = [...byEvent.values()].sort((a, b) => (b.ev.date || "").localeCompare(a.ev.date || ""));

    list.innerHTML = groups.map(({ ev, rows: rs }) => {
      const hits = rs.filter((r) => r.score.winnerOk).length;
      const pts = rs.reduce((s, r) => s + r.score.points, 0);
      return `
        <div class="hist-event">
          <div class="head">
            <div>
              <div class="name">${esc(ev.name)}</div>
              <div class="date">${fmtDate(ev.date)}</div>
            </div>
            <span class="chip ${hits / rs.length >= 0.5 ? "chip-hit" : "chip-miss"}">${hits}/${rs.length}</span>
          </div>
          <div class="score-line">${hits} de ${rs.length} aciertos · <strong>${pts} puntos</strong></div>
          ${rs.map((r) => histFightHTML(r)).join("")}
        </div>`;
    }).join("");
  }

  yearSel.onchange = paint;
  weightSel.onchange = paint;
  paint();
}

function histFightHTML({ fight: f, score }) {
  const pickName = f.pick.winner === "A" ? f.fighterA : f.fighterB;
  const realName = f.result.winner === "A" ? f.fighterA : f.fighterB;
  return `
    <div class="hist-fight">
      <div class="who">
        <div class="names">${esc(f.fighterA)} vs ${esc(f.fighterB)}</div>
        <div class="detail">
          Tu pick: ${esc(pickName)} · ${esc(methodText(f.pick.method, f.pick.round))} ${starsReadonly(f.pick.confidence || 0)}
          <br>Real: ${esc(realName)} · ${esc(methodText(f.result.method, f.result.round))} · ${esc(f.weightClass || "")}
        </div>
      </div>
      <div class="verdict">
        ${score.winnerOk
          ? `<span class="chip chip-hit">✓</span><br><span class="chip chip-pts">+${score.points}</span>`
          : `<span class="chip chip-miss">✗</span><br><span class="chip">0</span>`}
      </div>
    </div>`;
}

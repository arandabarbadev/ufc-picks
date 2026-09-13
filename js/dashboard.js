// Dashboard: cifras de predictor, próximo evento y gráficas.

import {
  computeGlobal, cumulativeByEvent, byWeightClass, bestWorst,
} from "./stats.js";
import { renderEvolutionChart, renderWeightChart } from "./charts.js";
import { esc, fmtDate, eventStatus } from "./ui.js";

export function renderDashboard(view, store) {
  const rows = store.resolvedRows;
  const g = computeGlobal(rows);
  const cum = cumulativeByEvent(rows);
  const classes = byWeightClass(rows);
  const bw = bestWorst(classes);

  // Próximo evento (el más cercano a partir de hoy)
  const next = [...store.events]
    .filter((e) => eventStatus(e) !== "past")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0];
  let nextHtml = "";
  if (next) {
    const fights = store.fightsByEvent.get(next.id) || [];
    const picks = fights.filter((f) => f.pick?.winner).length;
    nextHtml = `
      <a class="event-card next-event" href="#/event/${next.id}">
        <div class="row1">
          <div>
            <div class="name">${esc(next.name)}</div>
            <div class="date">${fmtDate(next.date)}</div>
          </div>
          ${eventStatus(next) === "today" ? `<span class="chip chip-upcoming">HOY 🔥</span>` : `<span class="chip chip-upcoming">PRÓXIMO</span>`}
        </div>
        <div class="meta">
          <span class="chip">${picks}/${fights.length} PICKS HECHOS</span>
          <span class="chip">TOCA PARA PICKEAR →</span>
        </div>
      </a>`;
  }

  const hasData = rows.length > 0;

  view.innerHTML = `
    <h2 class="view-title">TU RÉCORD</h2>
    <p class="view-sub">Panel de predictor · ${g.total} peleas resueltas</p>

    <div class="hero">
      <div class="label">% ACIERTO DE GANADOR</div>
      <div class="value">${hasData ? g.pctWinner + "%" : "—"}</div>
      <div class="detail">
        ${hasData
          ? `${g.correct} aciertos de ${g.total} picks · ${g.points} puntos totales`
          : "Marca el resultado de una pelea con pick para empezar tu historial"}
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi">
        <div class="k-label">% Acierto método</div>
        <div class="k-value">${hasData ? g.pctMethod + "%" : "—"}</div>
        <div class="k-sub">${g.methodCorrect} de ${g.total}</div>
      </div>
      <div class="kpi streak">
        <div class="k-label">Racha actual</div>
        <div class="k-value">${hasData ? g.streak : "—"}</div>
        <div class="k-sub">${g.streak > 0 ? "🔥 en racha" : "sin racha"}${hasData ? ` · récord ${g.bestStreak}` : ""}</div>
      </div>
      <div class="kpi">
        <div class="k-label">Picks perfectos</div>
        <div class="k-value">${g.perfect}</div>
        <div class="k-sub">ganador+método+round (3 pts)</div>
      </div>
      <div class="kpi">
        <div class="k-label">Puntos</div>
        <div class="k-value">${g.points}</div>
        <div class="k-sub">sistema 1/2/3 puntos</div>
      </div>
    </div>

    ${nextHtml ? `<h3 class="section-title">PRÓXIMO COMBATE</h3>${nextHtml}` : ""}

    ${hasData ? `
      <div class="chart-card">
        <h3>EVOLUCIÓN</h3>
        <p class="chart-sub">% de acierto acumulado, evento a evento</p>
        <div class="chart-box"><canvas id="chart-evolution"></canvas></div>
      </div>

      <div class="chart-card">
        <h3>ACIERTO POR CATEGORÍA</h3>
        <p class="chart-sub">% de acierto de ganador por peso</p>
        <div class="chart-box"><canvas id="chart-weight"></canvas></div>
      </div>

      ${bw.best || bw.worst ? `
        <div class="bestworst">
          <div class="kpi">
            <div class="k-label">Tu mejor peso</div>
            <div class="k-value good">${bw.best ? esc(bw.best.name) : "—"}</div>
            <div class="k-sub">${bw.best ? `${bw.best.pct}% (${bw.best.correct}/${bw.best.total})` : "mínimo 3 picks"}</div>
          </div>
          <div class="kpi">
            <div class="k-label">Tu peor peso</div>
            <div class="k-value bad">${bw.worst ? esc(bw.worst.name) : "—"}</div>
            <div class="k-sub">${bw.worst ? `${bw.worst.pct}% (${bw.worst.correct}/${bw.worst.total})` : "mínimo 3 picks"}</div>
          </div>
        </div>` : ""}
    ` : `
      <div class="empty">
        <h3>TU PRIMER EVENTO TE ESPERA</h3>
        <p>Crea un evento, añade peleas, haz tus picks… y tras el evento marca los
        resultados para ver tus estadísticas aquí.</p>
      </div>
    `}
  `;

  if (hasData) {
    const cv1 = view.querySelector("#chart-evolution");
    if (cv1) renderEvolutionChart(cv1, cum);
    const cv2 = view.querySelector("#chart-weight");
    if (cv2) renderWeightChart(cv2, classes);
  }
}

// Cálculo de puntuación y estadísticas.
// Sistema de puntos:
//   · Ganador correcto ............... 1 punto
//   · Ganador + método correcto ...... 2 puntos
//   · Ganador + método + round ....... 3 puntos (pick perfecto)
//   · Ganador fallado ................ 0 puntos
// El round solo cuenta si el método es KO/TKO o Sumisión
// (una Decisión no tiene round).

export const WEIGHT_CLASSES = [
  "Peso pesado",
  "Semipesado",
  "Peso mediano",
  "Peso wélter",
  "Peso ligero",
  "Peso pluma",
  "Peso gallo",
  "Peso mosca",
  "Peso paja femenino",
  "Peso gallo femenino",
  "Peso mosca femenino",
  "Catchweight",
];

export const METHODS = ["KO/TKO", "Sumisión", "Decisión"];
export const ROUNDS = ["1", "2", "3", "4", "5"];

/**
 * Puntúa una pelea que tiene pick Y resultado.
 * Devuelve { points, winnerOk, methodOk, roundOk } o null si aún no es resoluble.
 */
export function scoreFight(fight) {
  const { pick, result } = fight;
  if (!pick || !result || !pick.winner || !result.winner) return null;

  const winnerOk = pick.winner === result.winner;
  if (!winnerOk) return { points: 0, winnerOk: false, methodOk: false, roundOk: false };

  const methodOk = pick.method === result.method;
  const roundCounts = result.method !== "Decisión";
  const roundOk = roundCounts && String(pick.round ?? "-") === String(result.round ?? "-");

  const points = !methodOk ? 1 : roundOk ? 3 : 2;
  return { points, winnerOk: true, methodOk, roundOk };
}

/** ¿La pelea está resuelta (hay pick y resultado para comparar)? */
export function isResolved(fight) {
  return !!(fight.pick && fight.pick.winner && fight.result && fight.result.winner);
}

/**
 * Aplana todos los datos en una lista de peleas resueltas, ordenada
 * cronológicamente (fecha del evento → posición de la pelea).
 * Cada fila: { event, fight, score }.
 */
export function resolvedRows(events, fightsByEvent) {
  const rows = [];
  for (const ev of events) {
    const fights = fightsByEvent.get(ev.id) || [];
    for (const f of fights) {
      const score = scoreFight(f);
      if (score) rows.push({ event: ev, fight: f, score });
    }
  }
  rows.sort((a, b) =>
    (a.event.date || "").localeCompare(b.event.date || "") ||
    (a.fight.order || 0) - (b.fight.order || 0)
  );
  return rows;
}

/** Estadísticas globales a partir de las filas resueltas. */
export function computeGlobal(rows) {
  const total = rows.length;
  const correct = rows.filter((r) => r.score.winnerOk).length;
  const methodCorrect = rows.filter((r) => r.score.methodOk).length;
  const perfect = rows.filter((r) => r.score.points === 3).length;
  const points = rows.reduce((s, r) => s + r.score.points, 0);

  // Racha: aciertos de ganador consecutivos contando desde el pick más reciente
  let streak = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].score.winnerOk) streak++;
    else break;
  }
  let bestStreak = 0, cur = 0;
  for (const r of rows) {
    cur = r.score.winnerOk ? cur + 1 : 0;
    if (cur > bestStreak) bestStreak = cur;
  }

  const pct = (n) => (total === 0 ? null : Math.round((n / total) * 100));
  return {
    total, correct, methodCorrect, perfect, points,
    streak, bestStreak,
    pctWinner: pct(correct),
    pctMethod: pct(methodCorrect),
    pctPerfect: pct(perfect),
  };
}

/**
 * Evolución acumulada por evento (para la gráfica de línea).
 * Devuelve [{ label, winnerPct, methodPct }] en orden cronológico,
 * acumulando desde el primer evento.
 */
export function cumulativeByEvent(rows) {
  const byEvent = new Map();
  for (const r of rows) {
    if (!byEvent.has(r.event.id)) byEvent.set(r.event.id, { label: r.event.name || "Evento", date: r.event.date, w: 0, m: 0, n: 0 });
    const acc = byEvent.get(r.event.id);
    acc.n++; if (r.score.winnerOk) acc.w++; if (r.score.methodOk) acc.m++;
  }
  const events = [...byEvent.values()].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  let w = 0, m = 0, n = 0;
  return events.map((e) => {
    w += e.w; m += e.m; n += e.n;
    return {
      label: e.label,
      winnerPct: Math.round((w / n) * 100),
      methodPct: Math.round((m / n) * 100),
    };
  });
}

/** Acierto por categoría de peso, ordenado de mejor a peor. */
export function byWeightClass(rows) {
  const map = new Map();
  for (const r of rows) {
    const wc = r.fight.weightClass || "Sin categoría";
    if (!map.has(wc)) map.set(wc, { name: wc, total: 0, correct: 0 });
    const c = map.get(wc);
    c.total++; if (r.score.winnerOk) c.correct++;
  }
  return [...map.values()]
    .map((c) => ({ ...c, pct: Math.round((c.correct / c.total) * 100) }))
    .sort((a, b) => b.pct - a.pct || b.total - a.total);
}

/** Mejor y peor categoría (mínimo 3 picks resueltos para que cuente). */
export function bestWorst(classes) {
  const valid = classes.filter((c) => c.total >= 3);
  if (valid.length < 2) return { best: null, worst: null };
  return { best: valid[0], worst: valid[valid.length - 1] };
}

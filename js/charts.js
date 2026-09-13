// Gráficas del dashboard (Chart.js 4).
// Colores de la paleta validada para superficie oscura (#1a1a19):
//   serie 1 (rojo) #e66767 · contexto (gris) #898781 · grid #2c2c2a · tinta #c3c2b7

const C = {
  red: "#e66767",
  gray: "#898781",
  grid: "#2c2c2a",
  surface: "#1a1a19",
  ink: "#ffffff",
  ink2: "#c3c2b7",
};

function baseDefaults() {
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = C.gray;
  Chart.defaults.borderColor = C.grid;
}

/** Plugin: dibuja el valor al final de cada barra horizontal (texto en tinta neutra). */
const barEndLabels = {
  id: "barEndLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const data = chart.data.datasets[0].data;
    meta.data.forEach((bar, i) => {
      ctx.save();
      ctx.fillStyle = C.ink2;
      ctx.font = "600 12px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${data[i]}%`, bar.x + 7, bar.y);
      ctx.restore();
    });
  },
};

/** Plugin: etiqueta el último punto de cada línea (guiño corto del color + valor). */
const lineEndLabels = {
  id: "lineEndLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((ds, d) => {
      const meta = chart.getDatasetMeta(d);
      const last = meta.data[meta.data.length - 1];
      if (!last) return;
      ctx.save();
      // guión de color de la serie junto al número (la identidad la lleva la marca)
      ctx.strokeStyle = ds.borderColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(last.x + 8, last.y);
      ctx.lineTo(last.x + 16, last.y);
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.font = "700 12px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${ds.data[ds.data.length - 1]}%`, last.x + 20, last.y);
      ctx.restore();
    });
  },
};

function reuse(canvas) {
  if (canvas.__chart) canvas.__chart.destroy();
}

/**
 * Línea de evolución: % ganador (rojo) y % método (gris de contexto),
 * acumulado evento a evento.
 */
export function renderEvolutionChart(canvas, cum) {
  if (typeof Chart === "undefined") return;
  baseDefaults();
  reuse(canvas);

  canvas.__chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: cum.map((c) => c.label),
      datasets: [
        {
          label: "Acierto ganador",
          data: cum.map((c) => c.winnerPct),
          borderColor: C.red,
          backgroundColor: C.red,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: C.red,
          pointBorderColor: C.surface, // anillo de superficie
          pointBorderWidth: 2,
          tension: 0.25,
        },
        {
          label: "Acierto método",
          data: cum.map((c) => c.methodPct),
          borderColor: C.gray,
          backgroundColor: C.gray,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: C.gray,
          pointBorderColor: C.surface,
          pointBorderWidth: 2,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 44, top: 6 } },
      interaction: { mode: "index", intersect: false }, // un tooltip con todas las series
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: C.ink2, usePointStyle: false, boxWidth: 18, boxHeight: 2, padding: 14 },
        },
        tooltip: {
          backgroundColor: "#232322",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          titleColor: C.ink,
          bodyColor: C.ink2,
          displayColors: true,
          boxWidth: 10,
          boxHeight: 10,
          padding: 10,
          callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y}%` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: C.grid },
          ticks: { color: C.gray, maxRotation: 0, autoSkip: true, maxTicksLimit: 5 },
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: C.grid, lineWidth: 1 },
          border: { display: false },
          ticks: { color: C.gray, stepSize: 25, callback: (v) => `${v}%`, maxTicksLimit: 5 },
        },
      },
    },
    plugins: [lineEndLabels],
  });
}

/**
 * Barras horizontales: % de acierto por categoría de peso.
 * Una sola serie → todas las barras del mismo rojo, sin leyenda.
 */
export function renderWeightChart(canvas, classes) {
  if (typeof Chart === "undefined") return;
  baseDefaults();
  reuse(canvas);

  canvas.__chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: classes.map((c) => c.name.replace("Peso ", "").replace("peso ", "")),
      datasets: [
        {
          label: "% acierto",
          data: classes.map((c) => c.pct),
          backgroundColor: C.red,
          hoverBackgroundColor: "#f08a8a",
          maxBarThickness: 22,      // barra fina, el resto es aire
          borderRadius: 4,          // extremo redondeado del lado del valor
          borderSkipped: "start",   // la base queda cuadrada
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 38 } },
      plugins: {
        legend: { display: false }, // serie única: el título ya dice qué se dibuja
        tooltip: {
          backgroundColor: "#232322",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          titleColor: C.ink,
          bodyColor: C.ink2,
          displayColors: false,
          padding: 10,
          callbacks: {
            label: (c) => ` ${c.parsed.x}% · ${classes[c.dataIndex].correct}/${classes[c.dataIndex].total} picks`,
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: C.grid, lineWidth: 1 },
          border: { display: false },
          ticks: { color: C.gray, stepSize: 25, callback: (v) => `${v}%`, maxTicksLimit: 5 },
        },
        y: {
          grid: { display: false },
          border: { color: C.grid },
          ticks: { color: C.ink2 },
        },
      },
    },
    plugins: [barEndLabels],
  });
}

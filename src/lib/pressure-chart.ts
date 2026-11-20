import type { PressureHistoryPoint } from "@/lib/pressure";

const WIDTH = 240;
const HEIGHT = 72;
const X_PADDING = 8;
const Y_PADDING = 9;

function historyTimeLabel(time: string) {
  const [date = "", hour = ""] = time.split("T");
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)} ${hour.slice(0, 5)}`;
}

export function pressureHistoryChart(history: PressureHistoryPoint[]) {
  if (!history.length) return '<p class="pressure-history-empty">Recent pressure history is unavailable.</p>';

  const values = history.map((point) => point.msl);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = high === low ? 1 : (high - low) * 0.15;
  const chartLow = low - padding;
  const chartHigh = high + padding;
  const chartWidth = WIDTH - X_PADDING * 2;
  const chartHeight = HEIGHT - Y_PADDING * 2;
  const points = history.map((point, index) => ({
    x: X_PADDING + (history.length === 1 ? chartWidth / 2 : (index / (history.length - 1)) * chartWidth),
    y: Y_PADDING + ((chartHigh - point.msl) / (chartHigh - chartLow)) * chartHeight,
  }));
  const linePoints = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const latest = points.at(-1)!;
  const change = history.at(-1)!.msl - history[0]!.msl;
  const changeLabel = `${change >= 0 ? "+" : ""}${change.toFixed(1)} hPa`;

  return `<div class="pressure-history">
    <div class="pressure-history-heading"><span>Past 3 hours</span><strong>${changeLabel}</strong></div>
    <svg class="pressure-history-chart" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Pressure ranged from ${low.toFixed(1)} to ${high.toFixed(1)} hPa over the past 3 hours">
      <line class="pressure-history-grid" x1="${X_PADDING}" y1="${Y_PADDING}" x2="${WIDTH - X_PADDING}" y2="${Y_PADDING}" />
      <line class="pressure-history-grid" x1="${X_PADDING}" y1="${HEIGHT / 2}" x2="${WIDTH - X_PADDING}" y2="${HEIGHT / 2}" />
      <line class="pressure-history-grid" x1="${X_PADDING}" y1="${HEIGHT - Y_PADDING}" x2="${WIDTH - X_PADDING}" y2="${HEIGHT - Y_PADDING}" />
      ${points.length > 1 ? `<polyline class="pressure-history-line" points="${linePoints}" />` : ""}
      <circle class="pressure-history-latest" cx="${latest.x.toFixed(2)}" cy="${latest.y.toFixed(2)}" r="4" />
    </svg>
    <div class="pressure-history-labels"><span>Low ${low.toFixed(1)}</span><span>High ${high.toFixed(1)}</span></div>
    <div class="pressure-history-labels"><span>${historyTimeLabel(history[0]!.time)}</span><span>${historyTimeLabel(history.at(-1)!.time)}</span></div>
  </div>`;
}

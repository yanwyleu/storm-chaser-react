export const CITIES = [
  ["Toronto", 43.65, -79.38], ["Montreal", 45.5, -73.57], ["Ottawa", 45.42, -75.7],
  ["Quebec City", 46.81, -71.21], ["Halifax", 44.65, -63.58], ["St. John's", 47.56, -52.71],
  ["Fredericton", 45.96, -66.64], ["Thunder Bay", 48.38, -89.25], ["Winnipeg", 49.9, -97.14],
  ["Regina", 50.45, -104.62], ["Saskatoon", 52.13, -106.67], ["Calgary", 51.05, -114.07],
  ["Edmonton", 53.55, -113.49], ["Vancouver", 49.28, -123.12], ["Victoria", 48.43, -123.37],
  ["Yellowknife", 62.45, -114.37], ["Whitehorse", 60.72, -135.06], ["Iqaluit", 63.75, -68.52],
] as const;

export type PressureHistoryPoint = { time: string; msl: number };
export type Reading = { name: string; lat: number; lon: number; msl: number; surface: number; temp: number; history: PressureHistoryPoint[] };

export function status(msl: number) {
  if (msl < 1009) return { label: "Low", tone: "low" as const };
  if (msl > 1022) return { label: "High", tone: "high" as const };
  return { label: "Normal", tone: "normal" as const };
}

export function recentPressureHistory(data: any): PressureHistoryPoint[] {
  const times = data.hourly?.time;
  const pressures = data.hourly?.pressure_msl;
  if (!Array.isArray(times) || !Array.isArray(pressures) || typeof data.current?.time !== "string") return [];

  return times.flatMap((time: unknown, index: number) => {
    const msl = pressures[index];
    return typeof time === "string" && time <= data.current.time && typeof msl === "number" && Number.isFinite(msl)
      ? [{ time, msl }]
      : [];
  }).slice(-3);
}

export async function fetchReadings(points: { name: string; lat: number; lon: number }[]): Promise<Reading[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${points.map((p) => p.lat).join(",")}&longitude=${points.map((p) => p.lon).join(",")}&current=pressure_msl,surface_pressure,temperature_2m&hourly=pressure_msl&past_days=1&forecast_days=1&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((d: any, i: number): Reading => ({
    ...points[i]!, msl: d.current.pressure_msl, surface: d.current.surface_pressure, temp: d.current.temperature_2m,
    history: recentPressureHistory(d),
  }));
}

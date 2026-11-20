export type Severity = "calm" | "watch" | "warning" | "severe" | "extreme";
export type Place = { id: string; name: string; region: string; lat: number; lng: number };
export type Area = Place & {
  severity: Severity; condition: string; temp: number; wind: number; gust: number;
  rain: number; pressure: number; humidity: number; summary: string;
  hourly: { h: string; temp: number; rain: number; wind: number }[];
};
export const places: Place[] = [
  { id: "toronto", name: "Toronto", region: "Ontario", lat: 43.65, lng: -79.38 },
  { id: "buffalo", name: "Buffalo", region: "New York", lat: 42.89, lng: -78.88 },
  { id: "chicago", name: "Chicago", region: "Illinois", lat: 41.88, lng: -87.63 },
  { id: "miami", name: "Miami", region: "Florida", lat: 25.76, lng: -80.19 },
  { id: "halifax", name: "Halifax", region: "Nova Scotia", lat: 44.65, lng: -63.57 },
  { id: "denver", name: "Denver", region: "Colorado", lat: 39.74, lng: -104.99 },
];
export const getPlace = (id: string) => places.find((p) => p.id === id);
export const severityLabel: Record<Severity, string> = { calm: "Calm", watch: "Watch", warning: "Warning", severe: "Severe", extreme: "Extreme" };
export const severityRank: Record<Severity, number> = { calm: 0, watch: 1, warning: 2, severe: 3, extreme: 4 };

const codes: Record<number, string> = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers", 81: "Heavy showers", 82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe hail storm" };
export const describeCode = (c: number) => codes[c] ?? "Unknown";

/** Storm severity from current gusts (km/h), rain (mm/h) and weather code. */
export function severityFrom(gust: number, rain: number, code: number): Severity {
  if (gust >= 118 || code === 99) return "extreme";
  if (gust >= 90 || code === 96 || rain >= 15) return "severe";
  if (gust >= 70 || code === 95 || code === 82 || rain >= 7.5) return "warning";
  if (gust >= 50 || rain >= 2.5 || [65, 67, 75, 81, 86].includes(code)) return "watch";
  return "calm";
}
const summaries: Record<Severity, string> = {
  calm: "No storm activity right now.",
  watch: "Unsettled weather. Keep an eye on conditions.",
  warning: "Storm conditions likely. Secure loose objects and avoid unnecessary travel.",
  severe: "Severe weather in progress. Stay indoors and away from windows.",
  extreme: "Extreme, dangerous conditions. Follow local emergency guidance.",
};

export async function fetchLiveAreas(list: Place[] = places): Promise<Area[]> {
  const q = new URLSearchParams({
    latitude: list.map((p) => p.lat).join(","), longitude: list.map((p) => p.lng).join(","),
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_gusts_10m",
    hourly: "temperature_2m,precipitation,wind_speed_10m", forecast_hours: "8", timezone: "auto",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
  if (!res.ok) throw new Error(`Weather service error (${res.status})`);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : [json];
  return list.map((p, i) => {
    const c = arr[i].current, h = arr[i].hourly;
    const severity = severityFrom(c.wind_gusts_10m, c.precipitation, c.weather_code);
    return {
      ...p, severity, condition: describeCode(c.weather_code),
      temp: Math.round(c.temperature_2m), wind: Math.round(c.wind_speed_10m), gust: Math.round(c.wind_gusts_10m),
      rain: c.precipitation, pressure: Math.round(c.pressure_msl), humidity: c.relative_humidity_2m,
      summary: summaries[severity],
      hourly: h.time.map((t: string, j: number) => ({ h: t.slice(11, 16), temp: Math.round(h.temperature_2m[j]), rain: h.precipitation[j], wind: Math.round(h.wind_speed_10m[j]) })),
    };
  });
}
export const liveAreasQuery = { queryKey: ["live-areas"], queryFn: () => fetchLiveAreas(), refetchInterval: 10 * 60_000, staleTime: 5 * 60_000 };

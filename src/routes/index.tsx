import type { PressureMapHandle } from "@/components/PressureMap";
import { ConditionIcon } from "@/components/storm/ConditionIcon";
import { LazyMap } from "@/components/storm/LazyMap";
import { LazyPressureMap } from "@/components/storm/LazyPressureMap";
import { SeverityBadge } from "@/components/storm/SeverityBadge";
import { DEFAULT_CENTER, initialCenter, type LatLon } from "@/lib/geo";
import { CITIES, fetchReadings, Reading, status } from "@/lib/pressure";
import { liveAreasQuery, severityRank } from "@/lib/storms";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Stormwatch — Live storm map & alerts" },
    { name: "description", content: "Track live storm conditions on a map, browse areas and see detailed current weather." },
    { property: "og:title", content: "Stormwatch — Live storm map & alerts" },
    { property: "og:description", content: "Track live storm conditions on a map, browse areas and see detailed current weather." },
  ] }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState < "pressure" | "map" | "list" >("map");
  const [layer, setLayer] = useState<"storm" | "pressure">("storm");
  const { data, isLoading, error, dataUpdatedAt } = useQuery(liveAreasQuery);
  const areas = data ?? [];
  const sorted = [...areas].sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.gust - a.gust);
  const active = areas.filter((a) => a.severity !== "calm").length;

  const [readings, setReadings] = useState<Reading[]>([]);
  const [fetchError, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReadings(CITIES.map(([name, lat, lon]) => ({ name, lat, lon }))).then(setReadings).catch((e) => setError(e.message));
  }, []);

  const pick = async (lat: number, lon: number) => {
    try {
      const [r] = await fetchReadings([{ name: `Point ${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon }]);
      if (!r) return;
      setReadings((prev) => [r, ...prev.filter((p) => !p.name.startsWith("Point"))]);
    } catch (e: any) { setError(e.message); }
  };

  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; name: string; nonce: number } | null>(null);
  const pressureMap = useRef<PressureMapHandle | null>(null);

  // Map start point: device location when granted, Toronto otherwise.
  const [center, setCenter] = useState<LatLon>(DEFAULT_CENTER);
  const [locating, setLocating] = useState(true);
  useEffect(() => {
    let alive = true;
    initialCenter().then((c) => { if (alive) { setCenter(c); setLocating(false); } });
    return () => { alive = false; };
  }, []);
  const usingDevice = center.lat !== DEFAULT_CENTER.lat || center.lon !== DEFAULT_CENTER.lon;
  const nearest = picked
    ? readings.reduce<Reading | null>((best, r) => {
        const d = (r.lat - picked.lat) ** 2 + (r.lon - picked.lon) ** 2;
        const bd = best ? (best.lat - picked.lat) ** 2 + (best.lon - picked.lon) ** 2 : Infinity;
        return d < bd ? r : best;
      }, null)
    : null;

  const selectReading = (r: Reading) => {
    setPicked({ lat: r.lat, lon: r.lon });
    setFocus((f) => ({ lat: r.lat, lon: r.lon, name: r.name, nonce: (f?.nonce ?? 0) + 1 }));
  };

  return (
    <div className="app-shell">
      <header className="px-5 pt-6 pb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Stormwatch · Live</p>
        <h1 className="font-display text-3xl">{isLoading ? "Loading live weather…" : error ? "Weather unavailable" : `${active} of ${areas.length} areas under watch`}</h1>
        {dataUpdatedAt > 0 && <p className="text-xs text-muted-foreground">Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</p>}
        <p className="text-xs text-muted-foreground">
          {locating ? "Locating you…" : usingDevice ? "Centred on your location" : "Showing Toronto (default)"}
        </p>
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      </header>
      <div className="mx-5 mb-4 grid grid-cols-3 rounded-full bg-secondary p-1 text-sm">
        {(["pressure", "map", "list" ] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full py-2 transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t === "map" ? "Weather map" : t === "list" ? "Area list" : "Storm Radar"}
          </button>
        ))}
      </div>
      {tab === "map" ? (
        <div className="px-5">
          <div className="mb-3 flex gap-2 text-sm">
            {(["storm", "pressure"] as const).map((l) => (
              <button key={l} onClick={() => setLayer(l)} className={`rounded-full border border-border px-4 py-1.5 ${layer === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {l === "storm" ? "Storms" : "Pressure"}
              </button>
            ))}
          </div>
          <div className="h-[58vh] overflow-hidden rounded-3xl border border-border"><LazyMap areas={areas} mode={layer} center={center} /></div>
          {layer === "pressure" && (
            <div className="storm-card mt-3">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><i className="dot-low inline-block h-3 w-3 rounded-full" /> Low &lt;1000</span>
                <span className="flex items-center gap-1"><i className="dot-mid inline-block h-3 w-3 rounded-full" /> Normal</span>
                <span className="flex items-center gap-1"><i className="dot-high inline-block h-3 w-3 rounded-full" /> High &gt;1020</span>
              </div>
              <ul className="space-y-1 text-sm">
                {[...areas].sort((a, b) => a.pressure - b.pressure).map((a) => (
                  <li key={a.id} className="flex justify-between"><span>{a.name}</span><span className="font-display">{a.pressure} hPa</span></li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Low pressure usually means stormier weather.</p>
            </div>
          )}
        </div>
      ) : tab === "pressure" ? (
        <div className="px-5">
          <div className="mb-3 h-[58vh] overflow-hidden rounded-3xl border border-border">
            <LazyPressureMap readings={readings} focus={focus ?? undefined} center={center} onPick={(lat, lon) => setPicked({ lat, lon })} mapRef={pressureMap} />
          </div>
          {fetchError && <p className="mt-2 text-sm text-destructive">Pressure data unavailable: {fetchError}</p>}
          {!fetchError && !readings.length && <p className="mt-2 text-sm text-muted-foreground">Loading pressure readings…</p>}
          {nearest && (
            <div className="storm-card mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-xl">{nearest.name}</span>
                <span className="text-xs text-muted-foreground">{nearest.name === focus?.name ? "Selected station" : "Nearest station to your tap"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Sea level</p><p className="font-display text-lg">{Math.round(nearest.msl)} hPa</p></div>
                <div><p className="text-xs text-muted-foreground">Surface</p><p className="font-display text-lg">{Math.round(nearest.surface)} hPa</p></div>
                <div><p className="text-xs text-muted-foreground">Temp</p><p className="font-display text-lg">{nearest.temp}°</p></div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Status: {status(nearest.msl).label}. Tap the map to inspect another station.</p>
            </div>
          )}
          {!nearest && !fetchError && readings.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Tap the map or a station below to zoom in.</p>}
          <ul className="mt-3 space-y-1 text-sm">
            {[...readings].sort((a, b) => a.msl - b.msl).map((r) => (
              <li key={r.name}>
                <button
                  type="button"
                  onClick={() => selectReading(r)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-secondary ${focus?.name === r.name ? "bg-secondary" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <ConditionIcon reading={r} className={`h-4 w-4 shrink-0 ${r.msl < 1000 ? "text-[var(--pressure-low)]" : r.msl > 1020 ? "text-[var(--pressure-high)]" : "text-[var(--pressure-mid)]"}`} />
                    <span>
                      {r.name}
                      <span className="block text-xs text-muted-foreground">
                        {r.msl < 1000 ? "Low pressure · stormy" : r.msl > 1020 ? "High pressure · fair" : "Normal pressure · settled"}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display">{Math.round(r.msl)} hPa</span>
                    <span className="block text-xs text-muted-foreground">{status(r.msl).label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 pb-10 text-xs text-muted-foreground">Low pressure usually means stormier weather. Radar © RainViewer.</p>
        </div>
        )
        : (
        <ul className="space-y-3 px-5 pb-10">
          {sorted.map((a) => (
            <li key={a.id}>
              <Link to="/area/$id" params={{ id: a.id }} className="storm-card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2"><span className="font-display text-xl">{a.name}</span><SeverityBadge s={a.severity} /></div>
                  <p className="text-sm text-muted-foreground">{a.region} · {a.condition}</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl">{a.temp}°</div>
                  <div className="text-xs text-muted-foreground">gusts {a.gust} km/h</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="px-5 pb-6 text-xs text-muted-foreground">Weather data by Open-Meteo.com</p>
    </div>
  );
}

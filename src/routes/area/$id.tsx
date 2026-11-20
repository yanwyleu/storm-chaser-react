import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPlace, liveAreasQuery } from "@/lib/storms";
import { LazyMap } from "@/components/storm/LazyMap";
import { SeverityBadge } from "@/components/storm/SeverityBadge";

export const Route = createFileRoute("/area/$id")({
  loader: ({ params }) => { const p = getPlace(params.id); if (!p) throw notFound(); return p; },
  head: ({ loaderData }) => {
    const t = `${loaderData?.name ?? "Area"} live storm conditions — Stormwatch`;
    const d = `Current weather, wind gusts and 8-hour outlook for ${loaderData?.name ?? "this area"}.`;
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] };
  },
  component: Detail,
});

function Detail() {
  const place = Route.useLoaderData();
  const { data, error } = useQuery(liveAreasQuery);
  const a = data?.find((x) => x.id === place.id);
  return (
    <div className="app-shell pb-10">
      <div className="relative h-56"><LazyMap focus={[place.lat, place.lng]} areas={data ?? []} /></div>
      <div className="px-5 -mt-8 relative z-[500]">
        <div className="storm-card">
          <Link to="/" className="text-sm text-muted-foreground">← All areas</Link>
          <div className="mt-2 flex items-center gap-2"><h1 className="font-display text-3xl">{place.name}</h1>{a && <SeverityBadge s={a.severity} />}</div>
          <p className="text-muted-foreground">{place.region}</p>
          {error ? <p className="mt-4 text-destructive">{(error as Error).message}</p> : !a ? <p className="mt-4 text-muted-foreground">Loading live conditions…</p> : (
            <>
              <div className="mt-4 flex items-end gap-3"><span className="font-display text-6xl">{a.temp}°</span><span className="pb-2">{a.condition}</span></div>
              <p className="mt-3 text-sm">{a.summary}</p>
            </>
          )}
        </div>
        {a && <Stats a={a} />}
      </div>
    </div>
  );
}

function Stats({ a }: { a: NonNullable<Awaited<ReturnType<typeof liveAreasQuery.queryFn>>[number]> }) {
  const max = Math.max(...a.hourly.map((h) => h.rain), 0.1);
  const stats = [["Wind", `${a.wind} km/h`], ["Gusts", `${a.gust} km/h`], ["Rain", `${a.rain} mm/h`], ["Pressure", `${a.pressure} hPa`], ["Humidity", `${a.humidity}%`], ["Outlook peak", `${Math.max(...a.hourly.map((h) => h.wind))} km/h`]];
  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map(([k, v]) => <div key={k} className="storm-card !p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="font-display text-lg">{v}</div></div>)}
      </div>
      <h2 className="mt-6 mb-3 font-display text-xl">Next 8 hours · rain</h2>
      <div className="storm-card flex items-end justify-between gap-2">
        {a.hourly.map((h) => (
          <div key={h.h} className="flex flex-1 flex-col items-center gap-1 text-xs">
            <span>{h.temp}°</span>
            <div className="flex h-24 w-full items-end"><div className="w-full rounded-t bg-primary" style={{ height: `${(h.rain / max) * 100}%` }} /></div>
            <span className="text-muted-foreground">{h.h}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Weather data by Open-Meteo.com</p>
    </>
  );
}

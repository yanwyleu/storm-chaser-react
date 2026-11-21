import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "@tanstack/react-router";
import type { LatLon } from "@/lib/geo";
import type { Area } from "@/lib/storms";

/** Lets the area list fly the existing map to a city without remounting it. */
export type StormMapHandle = { focusOn: (lat: number, lng: number) => void };
/** Zoom used for a city when the area list selects it. */
export const AREA_ZOOM = 8;
/** Area-list selection: always flies there; `pin` keeps a highlight ring on the marker. */
export type MapSelection = { id: string; pin: boolean };
export default function StormMap({
  focus,
  center,
  areas,
  mode = "storm",
  selected,
  mapRef,
}: {
  focus?: [number, number] | undefined;
  center?: LatLon | undefined;
  areas: Area[];
  mode?: "storm" | "pressure";
  selected?: MapSelection | undefined;
  mapRef?: React.RefObject<StormMapHandle | null> | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const highlight = useRef<L.CircleMarker | null>(null);
  const nav = useNavigate();
  const navRef = useRef(nav);
  navRef.current = nav;
  const lat = focus?.[0] ?? center?.lat,
    lng = focus?.[1] ?? center?.lon;
  const flyTo = useRef<(lat: number, lng: number) => void>(() => {});
  // The mount-once effect reads this ref, so the handle never becomes stale.
  useEffect(() => {
    if (!mapRef) return;
    mapRef.current = { focusOn: (la, ln) => flyTo.current(la, ln) };
    return () => {
      mapRef.current = null;
    };
  }, [mapRef]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const css = getComputedStyle(document.documentElement);
    const map = L.map(el).setView(
      lat != null && lng != null ? [lat, lng] : [43.65, -79.38],
      lat != null ? 7 : 4,
    );
    mapObj.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    for (const a of areas) {
      if (mode === "pressure") {
        const band =
          a.pressure < 1000 ? "low" : a.pressure > 1020 ? "high" : "mid";
        const c = css.getPropertyValue(`--pressure-${band}`).trim();
        L.circleMarker([a.lat, a.lng], {
          radius: 14,
          color: c,
          fillColor: c,
          fillOpacity: 0.6,
          weight: 2,
        })
          .bindTooltip(`${a.pressure} hPa`, {
            permanent: true,
            direction: "top",
          })
          .on("click", () =>
            navRef.current({ to: "/area/$id", params: { id: a.id } }),
          )
          .addTo(map);
        continue;
      }
      const c = css.getPropertyValue(`--sev-${a.severity}`).trim();
      L.circleMarker([a.lat, a.lng], {
        radius: 10 + a.wind / 8,
        color: c,
        fillColor: c,
        fillOpacity: 0.45,
        weight: 2,
      })
        .bindTooltip(
          `${a.name} · ${a.condition} · ${a.temp}° · gusts ${a.gust} km/h`,
        )
        .on("click", () =>
          navRef.current({ to: "/area/$id", params: { id: a.id } }),
        )
        .addTo(map);
    }
    flyTo.current = (la, ln) => {
      map.flyTo([la, ln], Math.max(map.getZoom(), AREA_ZOOM), {
        duration: 0.8,
      });
    };
    return () => {
      mapObj.current = null;
      highlight.current = null;
      map.remove();
    };
  }, [lat, lng, areas, mode]);

  // Area list selection: fly to the city, and ring that marker when the row is pinned.
  useEffect(() => {
    const m = mapObj.current;
    if (!selected) {
      if (highlight.current && m) m.removeLayer(highlight.current);
      highlight.current = null;
      return;
    }
    const a = areas.find((x) => x.id === selected.id);
    if (!m || !a) return;
    flyTo.current(a.lat, a.lng);
    if (highlight.current) m.removeLayer(highlight.current);
    highlight.current = null;
    if (!selected.pin) return;
    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--ring")
        .trim() || "#111827";
    highlight.current = L.circleMarker([a.lat, a.lng], {
      radius: 22,
      color: accent,
      weight: 3,
      fill: false,
    }).addTo(m);
  }, [selected, areas]);
  return <div ref={ref} className="h-full w-full" />;
}

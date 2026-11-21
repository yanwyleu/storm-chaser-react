import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "@tanstack/react-router";
import type { LatLon } from "@/lib/geo";
import type { Area } from "@/lib/storms";

export default function StormMap({ focus, center, areas, mode = "storm" }: { focus?: [number, number] | undefined; center?: LatLon | undefined; areas: Area[]; mode?: "storm" | "pressure" }) {
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const navRef = useRef(nav);
  navRef.current = nav;
  const lat = focus?.[0] ?? center?.lat, lng = focus?.[1] ?? center?.lon;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const css = getComputedStyle(document.documentElement);
    const map = L.map(el).setView(lat != null && lng != null ? [lat, lng] : [43.65, -79.38], lat != null ? 7 : 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
    for (const a of areas) {
      if (mode === "pressure") {
        const band = a.pressure < 1000 ? "low" : a.pressure > 1020 ? "high" : "mid";
        const c = css.getPropertyValue(`--pressure-${band}`).trim();
        L.circleMarker([a.lat, a.lng], { radius: 14, color: c, fillColor: c, fillOpacity: 0.6, weight: 2 })
          .bindTooltip(`${a.pressure} hPa`, { permanent: true, direction: "top" })
          .on("click", () => navRef.current({ to: "/area/$id", params: { id: a.id } }))
          .addTo(map);
        continue;
      }
      const c = css.getPropertyValue(`--sev-${a.severity}`).trim();
      L.circleMarker([a.lat, a.lng], { radius: 10 + a.wind / 8, color: c, fillColor: c, fillOpacity: 0.45, weight: 2 })
        .bindTooltip(`${a.name} · ${a.condition} · ${a.temp}° · gusts ${a.gust} km/h`)
        .on("click", () => navRef.current({ to: "/area/$id", params: { id: a.id } }))
        .addTo(map);
    }
    return () => { map.remove(); };
  }, [lat, lng, areas, mode]);

  return <div ref={ref} className="h-full w-full" />;
}

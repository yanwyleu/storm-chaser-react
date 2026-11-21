import { DEFAULT_CENTER, type LatLon } from "@/lib/geo";
import { CITIES, status, type Reading } from "@/lib/pressure";
import { pressureHistoryChart } from "@/lib/pressure-chart";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export type PressureMapHandle = { resetView: () => void };

const isDeviceCenter = (c: LatLon) => c.lat !== DEFAULT_CENTER.lat || c.lon !== DEFAULT_CENTER.lon;

export default function PressureMap({ readings, focus, center = DEFAULT_CENTER, onPick, mapRef }: { readings: Reading[]; focus?: { lat: number; lon: number; name: string; nonce: number } | undefined; center?: LatLon | undefined; onPick: (lat: number, lon: number) => void; mapRef?: React.RefObject<PressureMapHandle | null> | undefined }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new globalThis.Map<string, L.Marker>());
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  // Latest centre, readable from the mount-once effect and the Leaflet control.
  const centerRef = useRef<LatLon>(center);
  const setViewRef = useRef<(m: L.Map, c: LatLon) => void>(() => {});

  useEffect(() => {
    if (!el.current || map.current) return;
    const isMobile = el.current.clientWidth < 640;
    map.current = L.map(el.current, { worldCopyJump: true });

    const fitsCanada = (m: L.Map) => m.fitBounds(
      L.latLngBounds(CITIES.map(([, lat, lon]) => [lat, lon] as L.LatLngTuple)),
      { paddingTopLeft: L.point(48, 88), paddingBottomRight: L.point(48, 92), maxZoom: 3, animate: false },
    );
    const applyCenter = (m: L.Map, c: LatLon) => {
      if (isMobile) { fitsCanada(m); return; }
      m.setView([c.lat, c.lon], isDeviceCenter(c) ? 7 : 4, { animate: false });
    };
    setViewRef.current = applyCenter;
    applyCenter(map.current, centerRef.current);

    if (mapRef) mapRef.current = { resetView: () => map.current && setViewRef.current(map.current, centerRef.current) };

    const reset = L.Control.extend({
      options: { position: "bottomright" as L.ControlPosition },
      onAdd: (m: L.Map) => {
        const btn = L.DomUtil.create("button", "map-reset-btn") as HTMLButtonElement;
        btn.type = "button";
        btn.title = "Recentre map";
        btn.setAttribute("aria-label", "Recentre map");
        btn.innerHTML = renderToStaticMarkup(<LocateFixed className="h-4 w-4" />);
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, "click", (e) => { L.DomEvent.stop(e); setViewRef.current(m, centerRef.current); });
        return btn;
      },
    });
    new reset().addTo(map.current);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const m = map.current;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((d) => {
        const frame = d.radar?.past?.at(-1);
        if (!frame || !map.current) return;
        const radar = L.tileLayer(`${d.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
          opacity: 0.7, maxNativeZoom: 7, attribution: "Radar © RainViewer",
        }).addTo(m);
        const legend = new L.Control({ position: "bottomleft" });
        legend.onAdd = () => {
          const div = L.DomUtil.create("div", "radar-legend");
          div.innerHTML = `<div class="radar-legend-title">Rain intensity</div><div class="radar-legend-bar"></div><div class="radar-legend-labels"><span>Light</span><span>Moderate</span><span>Heavy</span><span>Storm</span></div>`;
          return div;
        };
        legend.addTo(m);
        m.on("overlayadd", (e) => e.layer === radar && legend.addTo(m));
        m.on("overlayremove", (e) => e.layer === radar && legend.remove());
        L.control.layers(undefined, { "Storm radar": radar, "Pressure": layer.current! }, { collapsed: false }).addTo(m);
      })
      .catch(() => {});
    map.current.on("click", (e) => pickRef.current(e.latlng.lat, e.latlng.lng));
    return () => { map.current?.remove(); map.current = null; };
  }, [mapRef]);

  // Geolocation resolves after mount: glide to the device position once it arrives.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const prev = centerRef.current;
    if (prev.lat === center.lat && prev.lon === center.lon) return;
    centerRef.current = center;
    setViewRef.current(m, center);
  }, [center]);

  useEffect(() => {
    layer.current?.clearLayers();
    markers.current.clear();
    readings.forEach((r) => {
      const s = status(r.msl);
      const icon = L.divIcon({ className: "", html: `<div class="pin pin-${s.tone}">${Math.round(r.msl)}</div>`, iconSize: [52, 26], iconAnchor: [26, 13] });
      const marker = L.marker([r.lat, r.lon], { icon }).addTo(layer.current!).bindPopup(
        `<b>${r.name}</b><br/>Sea level: ${r.msl} hPa<br/>Surface: ${r.surface} hPa<br/>Temp: ${r.temp} °C<br/>Status: ${s.label}${pressureHistoryChart(r.history)}`,
        {
          minWidth: 250,
          maxWidth: 280,
          autoPanPaddingTopLeft: L.point(48, 88),
          autoPanPaddingBottomRight: L.point(48, 92),
        },
      );
      markers.current.set(r.name, marker);
    });
  }, [readings]);

  useEffect(() => {
    const m = map.current;
    if (!m || !focus) return;
    m.flyTo([focus.lat, focus.lon], Math.max(m.getZoom(), 7), { duration: 0.8 });
    markers.current.get(focus.name)?.openPopup();
  }, [focus]);

  return <div ref={el} className="h-full w-full" />;
}

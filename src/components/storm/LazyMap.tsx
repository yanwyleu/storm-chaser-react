import { ClientOnly } from "@tanstack/react-router";
import type { LatLon } from "@/lib/geo";
import type { Area } from "@/lib/storms";
import { lazy, Suspense } from "react";
const StormMap = lazy(() => import("./StormMap"));
export function LazyMap({ focus, center, areas, mode = "storm" }: { focus?: [number, number] | undefined; center?: LatLon | undefined; areas: Area[]; mode?: "storm" | "pressure" }) {
  const fb = <div className="h-full w-full animate-pulse bg-muted" />;
  return <ClientOnly fallback={fb}><Suspense fallback={fb}><StormMap focus={focus} center={center} areas={areas} mode={mode} /></Suspense></ClientOnly>;
}

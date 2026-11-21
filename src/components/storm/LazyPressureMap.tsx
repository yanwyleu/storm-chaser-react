import type { LatLon } from "@/lib/geo";
import type { Reading } from "@/lib/pressure";
import type { PressureMapHandle } from "../PressureMap";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const PressureMap = lazy(() => import("../PressureMap"));
export function LazyPressureMap({ readings, focus, center, onPick, mapRef }: { readings: Reading[]; focus?: { lat: number; lon: number; name: string; nonce: number } | undefined; center?: LatLon | undefined; onPick: (lat: number, lon: number) => void; mapRef?: React.RefObject<PressureMapHandle | null> | undefined }) {
  const fb = <div className="h-full w-full animate-pulse bg-muted" />;
  return <ClientOnly fallback={fb}><Suspense fallback={fb}><PressureMap readings={readings} focus={focus} center={center} onPick={onPick} mapRef={mapRef} /></Suspense></ClientOnly>;
}

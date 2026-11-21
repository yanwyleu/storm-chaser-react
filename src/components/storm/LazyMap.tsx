import { ClientOnly } from "@tanstack/react-router";
import type { LatLon } from "@/lib/geo";
import type { Area } from "@/lib/storms";
import { lazy, Suspense } from "react";
import type { MapSelection, StormMapHandle } from "./StormMap";
const StormMap = lazy(() => import("./StormMap"));
export function LazyMap({
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
  const fb = <div className="h-full w-full animate-pulse bg-muted" />;
  return (
    <ClientOnly fallback={fb}>
      <Suspense fallback={fb}>
        <StormMap
          focus={focus}
          center={center}
          areas={areas}
          mode={mode}
          selected={selected}
          mapRef={mapRef}
        />
      </Suspense>
    </ClientOnly>
  );
}

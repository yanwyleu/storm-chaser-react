import { ClientOnly } from "@tanstack/react-router";
import type { Area } from "@/lib/storms";
import { lazy, Suspense } from "react";
const StormMap = lazy(() => import("./StormMap"));
export function LazyMap({ focus, areas, mode = "storm" }: { focus?: [number, number] | undefined; areas: Area[]; mode?: "storm" | "pressure" }) {
  const fb = <div className="h-full w-full animate-pulse bg-muted" />;
  return <ClientOnly fallback={fb}><Suspense fallback={fb}><StormMap focus={focus} areas={areas} mode={mode} /></Suspense></ClientOnly>;
}

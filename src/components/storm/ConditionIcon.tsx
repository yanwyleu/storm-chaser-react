import { CloudLightning, CloudSun, Sun } from "lucide-react";
import type { Reading } from "@/lib/pressure";

/** Storm/condition icon for a reading, keyed off its sea-level pressure status. */
export function ConditionIcon({ reading, className }: { reading: Reading; className?: string }) {
  const cls = className ?? "h-4 w-4";
  if (reading.msl < 1000) return <CloudLightning className={cls} aria-hidden />;
  if (reading.msl > 1020) return <Sun className={cls} aria-hidden />;
  return <CloudSun className={cls} aria-hidden />;
}

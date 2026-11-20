import { severityLabel, type Severity } from "@/lib/storms";
export function SeverityBadge({ s }: { s: Severity }) {
  return <span className={`sev-badge sev-${s}`}>{severityLabel[s]}</span>;
}

import { RiskLevel, RISK_LABEL } from "@/lib/logic";

export function RiskChip({ level }: { level: RiskLevel }) {
  return (
    <span className={`chip chip-${level}`}>
      <span className="dot" /> {RISK_LABEL[level]}
    </span>
  );
}

const ESTADO_LABEL: Record<string, string> = { abierto: "Abierto", seguimiento: "En seguimiento", cerrado: "Cerrado" };
export function EstadoBadge({ estado }: { estado: string }) {
  return <span className={`badge ${estado}`}>{ESTADO_LABEL[estado] ?? estado}</span>;
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

export function Topbar({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { RiskChip } from "@/components/ui";
import AtencionFormModal from "@/components/AtencionFormModal";
import { RiskLevel } from "@/lib/logic";

export type AlertGroup = {
  studentId: string;
  nombre: string;
  carrera: string;
  seccion?: string | null;
  matricula: string;
  risk: RiskLevel;
  reasons: { ic: string; tipo: string; detalle: string }[];
};

export default function AlertList({ groups }: { groups: AlertGroup[] }) {
  const [filter, setFilter] = useState<"todas" | "rojo" | "amarillo">("todas");
  const list = filter === "todas" ? groups : groups.filter((g) => g.risk === filter);

  return (
    <>
      <div className="toolbar">
        <div className="pillbar">
          {[
            ["todas", "Todas"],
            ["rojo", "🔴 Riesgo alto"],
            ["amarillo", "🟡 Riesgo medio"],
          ].map(([v, l]) => (
            <button key={v} className={`filter-pill ${filter === v ? "active" : ""}`} onClick={() => setFilter(v as any)}>
              {l}
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12.5 }}>{list.length} estudiante(s) con alerta</span>
      </div>

      {list.length === 0 ? (
        <div className="card empty-state">✅ Sin alertas en esta categoría.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map((g) => (
            <div className="card card-pad alert-card" key={g.studentId}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b style={{ fontSize: 14.5 }}>{g.nombre}</b>
                    <span className="muted" style={{ fontSize: 12 }}>· {g.carrera}{g.seccion ? ` (${g.seccion})` : ""} · {g.matricula}</span>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
                    <RiskChip level={g.risk} />
                    <span className="badge">{g.reasons.length} motivo{g.reasons.length > 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flex: "none" }}>
                  <Link href={`/estudiantes/${g.studentId}`} className="btn btn-sm">Ver ficha</Link>
                  <AtencionFormModal
                    students={[{ id: g.studentId, nombre: g.nombre, matricula: g.matricula }]}
                    presetStudentId={g.studentId}
                    trigger={<button className="btn btn-sm btn-primary">+ Atender</button>}
                  />
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 4, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                {g.reasons.map((r, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    {r.ic} <b style={{ color: "var(--ink)", fontWeight: 600 }}>{r.tipo}</b> — {r.detalle}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

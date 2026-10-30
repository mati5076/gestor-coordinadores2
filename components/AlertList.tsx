"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { RiskChip, initials } from "@/components/ui";
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

type Filter = "todas" | "rojo" | "amarillo";

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);

export default function AlertList({ groups }: { groups: AlertGroup[] }) {
  const [filter, setFilter] = useState<Filter>("todas");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      todas: groups.length,
      rojo: groups.filter((g) => g.risk === "rojo").length,
      amarillo: groups.filter((g) => g.risk === "amarillo").length,
    }),
    [groups]
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter(
      (g) =>
        (filter === "todas" || g.risk === filter) &&
        (!q || g.nombre.toLowerCase().includes(q) || g.matricula.toLowerCase().includes(q) || g.carrera.toLowerCase().includes(q))
    );
  }, [groups, filter, query]);

  const FILTERS: { key: Filter; label: string; cls: string }[] = [
    { key: "todas", label: "Todas", cls: "f-todas" },
    { key: "rojo", label: "Riesgo alto", cls: "f-rojo" },
    { key: "amarillo", label: "Riesgo medio", cls: "f-amarillo" },
  ];

  return (
    <>
      <div className="toolbar">
        <div className="pillbar" role="tablist" aria-label="Filtrar alertas por nivel de riesgo">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`filter-pill ${f.cls} ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.key !== "todas" && <span className="pdot" />}
              {f.label}
              <span className="pcount">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label className="search-box">
            <SearchIcon />
            <input type="search" placeholder="Buscar alumno o matrícula…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {list.length} estudiante{list.length === 1 ? "" : "s"} con alerta
          </span>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          {groups.length === 0 ? "¡Todo en orden! No hay estudiantes con alertas." : "Ninguna alerta coincide con tu búsqueda o filtro."}
        </div>
      ) : (
        <div className="alert-list">
          {list.map((g) => (
            <div className={`card card-pad alert-card risk-${g.risk}`} key={g.studentId}>
              <div className="alert-card-head">
                <div className="alert-who">
                  <div className="avatar">{initials(g.nombre)}</div>
                  <div style={{ minWidth: 0 }}>
                    <b>{g.nombre}</b>
                    <div className="alert-meta">
                      {g.carrera}
                      {g.seccion ? ` (${g.seccion})` : ""} · {g.matricula}
                    </div>
                    <div className="alert-tags">
                      <RiskChip level={g.risk} />
                      <span className="badge">
                        {g.reasons.length} motivo{g.reasons.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="alert-actions">
                  <Link href={`/estudiantes/${g.studentId}`} className="btn btn-sm">
                    Ver ficha
                  </Link>
                  <AtencionFormModal
                    students={[{ id: g.studentId, nombre: g.nombre, matricula: g.matricula }]}
                    presetStudentId={g.studentId}
                    trigger={<button type="button" className="btn btn-sm btn-primary">+ Atender</button>}
                  />
                </div>
              </div>
              <ul className="reason-list">
                {g.reasons.map((r, i) => (
                  <li key={i}>
                    <span className="reason-ic">{r.ic}</span>
                    <span>
                      <b>{r.tipo}</b>
                      {r.detalle}
                    </span>
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

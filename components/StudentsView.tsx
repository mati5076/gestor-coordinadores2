"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { RiskChip, initials, fmtDate } from "@/components/ui";
import StudentFormModal from "@/components/StudentFormModal";
import StudentExport, { StudentRow, AtencionRow } from "@/components/StudentExport";
import { MODALIDADES, RiskLevel, asistenciaEstado, asistenciaMinimaDe, modalidadLabel, fmtPct } from "@/lib/logic";

type RiesgoFilter = "todos" | RiskLevel;
type AsistenciaFilter = "todas" | "critica" | "baja" | "normal";
type ModalidadFilter = "todas" | string;

// Sin tildes y en minúsculas, para que "sepulveda" encuentre "Sepúlveda"
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);

export default function StudentsView({ students, atenciones }: { students: StudentRow[]; atenciones: AtencionRow[] }) {
  const [query, setQuery] = useState("");
  const [riesgo, setRiesgo] = useState<RiesgoFilter>("todos");
  const [carrera, setCarrera] = useState("todas");
  const [asistencia, setAsistencia] = useState<AsistenciaFilter>("todas");
  const [rendimiento, setRendimiento] = useState("todos");
  const [abandono, setAbandono] = useState("todos");
  const [modalidad, setModalidad] = useState<ModalidadFilter>("todas");

  const carreras = useMemo(() => [...new Set(students.map((s) => s.carrera))].sort((a, b) => a.localeCompare(b)), [students]);

  const hayFiltros = query.trim() !== "" || riesgo !== "todos" || carrera !== "todas" || asistencia !== "todas" || modalidad !== "todas" || rendimiento !== "todos" || abandono !== "todos";
  function limpiar() {
    setQuery(""); setRiesgo("todos"); setCarrera("todas"); setAsistencia("todas"); setModalidad("todas"); setRendimiento("todos"); setAbandono("todos");
  }

  // `ignorarRiesgo` sirve para contar cuántos hay en cada nivel respetando el resto de filtros
  const coincide = (s: StudentRow, ignorarRiesgo: boolean) => {
    if (!ignorarRiesgo && riesgo !== "todos" && s.riesgo !== riesgo) return false;
    if (carrera !== "todas" && s.carrera !== carrera) return false;
    if (rendimiento !== "todos" && s.rendimiento !== rendimiento) return false;
    if (abandono === "si" && !s.abandono) return false;
    if (abandono === "no" && s.abandono) return false;
    if (modalidad !== "todas" && (s.modalidad ?? "sin") !== modalidad) return false;
    // La asistencia se compara contra el mínimo de cada materia (las online no tienen asistencia)
    if (asistencia !== "todas" && asistenciaEstado(s) !== asistencia) return false;
    const q = norm(query.trim());
    if (q && ![s.nombre, s.matricula, s.carrera, s.seccion, s.email].some((v) => norm(v).includes(q))) return false;
    return true;
  };

  const list = useMemo(
    () => students.filter((s) => coincide(s, false)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, query, riesgo, carrera, asistencia, modalidad, rendimiento, abandono]
  );
  const counts = useMemo(() => {
    const base = students.filter((s) => coincide(s, true));
    return {
      todos: base.length,
      verde: base.filter((s) => s.riesgo === "verde").length,
      amarillo: base.filter((s) => s.riesgo === "amarillo").length,
      rojo: base.filter((s) => s.riesgo === "rojo").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, query, carrera, asistencia, modalidad, rendimiento, abandono]);

  const PILLS: { key: RiesgoFilter; label: string; cls: string }[] = [
    { key: "todos", label: "Todos", cls: "f-todas" },
    { key: "verde", label: "Sin riesgo", cls: "f-verde" },
    { key: "amarillo", label: "Riesgo medio", cls: "f-amarillo" },
    { key: "rojo", label: "Riesgo alto", cls: "f-rojo" },
  ];

  return (
    <>
      <div className="toolbar">
        <div className="pillbar" role="tablist" aria-label="Filtrar estudiantes por nivel de riesgo">
          {PILLS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={riesgo === p.key}
              className={`filter-pill ${p.cls} ${riesgo === p.key ? "active" : ""}`}
              onClick={() => setRiesgo(p.key)}
            >
              {p.key !== "todos" && <span className="pdot" />}
              {p.label}
              <span className="pcount">{counts[p.key]}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label className="search-box">
            <SearchIcon />
            <input type="search" placeholder="Buscar nombre, matrícula, carrera…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar estudiantes" />
          </label>
          <StudentExport students={list} atenciones={atenciones} />
        </div>
      </div>

      <div className="filters-row">
        <select className="select-sm" value={carrera} onChange={(e) => setCarrera(e.target.value)} aria-label="Filtrar por carrera">
          <option value="todas">Todas las carreras</option>
          {carreras.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select-sm" value={asistencia} onChange={(e) => setAsistencia(e.target.value as AsistenciaFilter)} aria-label="Filtrar por asistencia">
          <option value="todas">Toda asistencia</option>
          <option value="critica">Crítica (bajo el mínimo de la materia)</option>
          <option value="baja">Baja (a menos de 10 puntos del mínimo)</option>
          <option value="normal">Normal</option>
        </select>
        <select className="select-sm" value={modalidad} onChange={(e) => setModalidad(e.target.value)} aria-label="Filtrar por tipo de materia">
          <option value="todas">Todo tipo de materia</option>
          {MODALIDADES.filter((m) => m.value !== "otra").map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          <option value="otra">Otra (personalizada)</option>
          <option value="sin">Sin definir</option>
        </select>
        <select className="select-sm" value={rendimiento} onChange={(e) => setRendimiento(e.target.value)} aria-label="Filtrar por rendimiento">
          <option value="todos">Todo rendimiento</option>
          <option value="alto">Rendimiento alto</option>
          <option value="medio">Rendimiento medio</option>
          <option value="bajo">Rendimiento bajo</option>
        </select>
        <select className="select-sm" value={abandono} onChange={(e) => setAbandono(e.target.value)} aria-label="Filtrar por abandono">
          <option value="todos">Con y sin abandono</option>
          <option value="no">Sin abandono</option>
          <option value="si">Con abandono</option>
        </select>
        {hayFiltros && <button type="button" className="btn btn-sm" onClick={limpiar}>Limpiar filtros</button>}
        <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto" }}>
          {list.length} de {students.length} estudiante{students.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="card">
        {students.length === 0 ? (
          <div className="empty-state">Aún no hay estudiantes registrados. Agrega el primero con el botón de arriba o impórtalos desde un CSV.</div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            Ningún estudiante coincide con la búsqueda o los filtros.{" "}
            <button type="button" className="btn btn-sm" onClick={limpiar} style={{ marginLeft: 6 }}>Limpiar filtros</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Estudiante</th><th>Carrera</th><th>Sección</th><th>Tipo de materia</th><th>Asistencia</th><th>Riesgo</th><th>Atenciones</th><th>Última atención</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/estudiantes/${s.id}`} className="stu-name-cell">
                      <div className="avatar">{initials(s.nombre)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.nombre}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{s.matricula}</div>
                      </div>
                    </Link>
                  </td>
                  <td>{s.carrera}</td>
                  <td className="muted">{s.seccion || "—"}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{modalidadLabel(s.modalidad)}</td>
                  {(() => {
                    const est = asistenciaEstado(s);
                    if (est === "na") return <td className="muted">Sin asistencia</td>;
                    return (
                      <td style={{ fontWeight: 600, color: est === "critica" ? "var(--rojo)" : est === "baja" ? "var(--amarillo)" : undefined }}>
                        {fmtPct(s.asistencia)} <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>/ mín. {asistenciaMinimaDe(s)}%</span>
                      </td>
                    );
                  })()}
                  <td><RiskChip level={s.riesgo} /></td>
                  <td>{s.nAtenciones}</td>
                  <td className="muted">{s.ultimaAtencion ? fmtDate(s.ultimaAtencion) : "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <StudentFormModal existing={s} trigger={<button className="btn btn-sm">Editar</button>} />{" "}
                    <Link href={`/estudiantes/${s.id}`} className="muted">Ver ficha →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

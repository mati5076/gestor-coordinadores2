"use client";
import { useEffect, useRef, useState } from "react";
import { RISK_LABEL, RiskLevel, modalidadLabel } from "@/lib/logic";
import type { SheetSpec } from "@/lib/xlsx";

export type StudentRow = {
  id: string;
  nombre: string;
  matricula: string;
  carrera: string;
  seccion: string | null;
  email: string | null;
  telefono: string | null;
  asistencia: number;
  modalidad: string | null;
  asistenciaMinima: number | null;
  rendimiento: string;
  evaluacionesPerdidas: number;
  riesgoManual: string | null;
  abandono: boolean;
  /** Nivel de riesgo ya calculado (manual o automático) */
  riesgo: RiskLevel;
  nAtenciones: number;
  ultimaAtencion: string | null; // YYYY-MM-DD
};

export type AtencionRow = {
  studentId: string;
  fecha: string;
  responsable: string;
  tipo: string;
  tema: string;
  duracionMin: number;
  estado: string;
  resueltoPrimerContacto: boolean;
  fechaSeguimientoComprometido: string | null;
  fechaCierre: string | null;
  observaciones: string | null;
  acuerdos: string | null;
};

const ESTADO: Record<string, string> = { abierto: "Abierto", seguimiento: "En seguimiento", cerrado: "Cerrado" };
const RENDIMIENTO: Record<string, string> = { alto: "Alto", medio: "Medio", bajo: "Bajo" };

// Mismas columnas que la plantilla de importación: lo exportado se puede volver a importar tal cual.
const CSV_HEAD = ["nombre", "matricula", "carrera", "seccion", "modalidad", "asistenciaMinima", "email", "telefono", "asistencia", "rendimiento", "evaluacionesPerdidas", "riesgo", "abandono"];

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);
const CsvIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
  </svg>
);
const ExcelIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E7A32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" />
  </svg>
);

/** Botón "Exportar" con menú: CSV o Excel. Exporta solo los estudiantes que se están viendo (con búsqueda y filtros aplicados). */
export default function StudentExport({ students, atenciones }: { students: StudentRow[]; atenciones: AtencionRow[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic afuera o con Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function exportCSV() {
    setOpen(false);
    const lines = [CSV_HEAD.join(",")].concat(
      students.map((s) =>
        [s.nombre, s.matricula, s.carrera, s.seccion ?? "", s.modalidad ?? "", s.asistenciaMinima ?? "", s.email ?? "", s.telefono ?? "", s.asistencia, s.rendimiento,
          s.evaluacionesPerdidas, s.riesgoManual ?? "", s.abandono ? "si" : "no"].map(cell).join(",")
      )
    );
    download(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), `estudiantes-${stamp()}.csv`);
  }

  async function exportExcel() {
    setOpen(false);
    setError("");
    setBusy(true);
    try {
      const { buildXlsx } = await import("@/lib/xlsx");
      const byId = new Map(students.map((s) => [s.id, s]));

      const hojas: SheetSpec[] = [
        {
          name: "Estudiantes",
          columns: [
            { header: "Nombre", width: 30 }, { header: "Matrícula", width: 14 }, { header: "Carrera", width: 30 }, { header: "Sección", width: 22 },
            { header: "Tipo de materia", width: 22 }, { header: "Asistencia mínima (%)", width: 21, type: "pct" },
            { header: "Email", width: 28 }, { header: "Teléfono", width: 16 }, { header: "Asistencia (%)", width: 15, type: "pct" },
            { header: "Rendimiento", width: 13 }, { header: "Evaluaciones no rendidas", width: 24, type: "int" }, { header: "Riesgo", width: 14 },
            { header: "Abandono", width: 11 }, { header: "Atenciones", width: 12, type: "int" }, { header: "Última atención", width: 16, type: "date" },
          ],
          rows: students.map((s) => [
            s.nombre, s.matricula, s.carrera, s.seccion, modalidadLabel(s.modalidad), s.asistenciaMinima, s.email, s.telefono, s.modalidad === "online" ? null : s.asistencia,
            RENDIMIENTO[s.rendimiento] ?? s.rendimiento, s.evaluacionesPerdidas, RISK_LABEL[s.riesgo], s.abandono ? "Sí" : "No",
            s.nAtenciones, s.ultimaAtencion,
          ]),
        },
      ];

      // Segunda tabla: el historial de atenciones de los estudiantes exportados
      const atRows = atenciones
        .filter((a) => byId.has(a.studentId))
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map((a) => {
          const s = byId.get(a.studentId)!;
          return [
            s.nombre, s.matricula, a.fecha, a.responsable, a.tipo, a.tema, a.duracionMin, ESTADO[a.estado] ?? a.estado,
            a.resueltoPrimerContacto ? "Sí" : "No", a.fechaSeguimientoComprometido, a.fechaCierre, a.observaciones, a.acuerdos,
          ];
        });
      if (atRows.length > 0) {
        hojas.push({
          name: "Atenciones",
          columns: [
            { header: "Estudiante", width: 30 }, { header: "Matrícula", width: 14 }, { header: "Fecha", width: 13, type: "date" },
            { header: "Responsable", width: 22 }, { header: "Tipo", width: 14 }, { header: "Tema", width: 32 },
            { header: "Duración (min)", width: 15, type: "int" }, { header: "Estado", width: 15 }, { header: "Resuelto en 1er contacto", width: 24 },
            { header: "Seguimiento comprometido", width: 24, type: "date" }, { header: "Fecha de cierre", width: 16, type: "date" },
            { header: "Observaciones", width: 40 }, { header: "Acuerdos", width: 40 },
          ],
          rows: atRows,
        });
      }

      download(await buildXlsx(hojas), `estudiantes-${stamp()}.xlsx`);
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el Excel. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="btn btn-outline-primary"
        disabled={students.length === 0 || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <DownloadIcon /> {busy ? "Generando…" : `Exportar (${students.length})`} <span aria-hidden="true" style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <button type="button" role="menuitem" onClick={exportExcel}>
            <ExcelIcon />
            <span><b>Excel (.xlsx)</b><small>Con tablas: estudiantes y atenciones</small></span>
          </button>
          <button type="button" role="menuitem" onClick={exportCSV}>
            <CsvIcon />
            <span><b>CSV (.csv)</b><small>Se puede volver a importar</small></span>
          </button>
        </div>
      )}
      {error && <div className="auth-error" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 260, zIndex: 31 }}>{error}</div>}
    </div>
  );
}

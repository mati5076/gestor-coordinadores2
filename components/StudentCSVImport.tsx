"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importStudentsCSV, ImportResult } from "@/app/estudiantes/import-actions";

const PLANTILLA =
  "nombre,matricula,carrera,seccion,email,telefono,inasistencias,rendimiento,evaluacionesPerdidas,riesgo,abandono\n" +
  "Ana Pérez Soto,2024-0001,Ingeniería Comercial,Sección A,ana.perez@alumnos.cl,+56912345678,2,medio,0,,no\n";

const UploadIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);

export default function StudentCSVImport() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function close() {
    setOpen(false);
    setResult(null);
    setFileName("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        setResult(await importStudentsCSV(fd));
        router.refresh();
      } catch {
        setResult({ ok: false, message: "No se pudo importar el archivo. Inténtalo de nuevo.", creados: 0, actualizados: 0, errores: [] });
      }
    });
  }

  function descargarPlantilla() {
    const url = URL.createObjectURL(new Blob(["﻿" + PLANTILLA], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-estudiantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button type="button" className="btn btn-outline-primary" onClick={() => setOpen(true)}>
        <UploadIcon /> Importar desde CSV
      </button>
      {open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal-box">
            <div className="modal-head">
              <h2 style={{ margin: 0, fontSize: 17 }}>Importar estudiantes desde CSV</h2>
              <button type="button" className="close-x" onClick={close} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              <div className="help-box">
                Sube el archivo con los estudiantes que ya tienes. Columnas obligatorias: <b>nombre, matricula, carrera</b>.
                Opcionales: seccion, email, telefono, inasistencias, rendimiento (alto/medio/bajo), evaluacionesPerdidas,
                riesgo (verde/amarillo/rojo) y abandono (si/no). Si la matrícula ya existe, el estudiante se
                <b> actualiza</b>; si no, se <b>crea</b>. Acepta separador coma o punto y coma (Excel).
              </div>
              <button type="button" className="btn btn-sm" onClick={descargarPlantilla} style={{ marginBottom: 14 }}>
                Descargar plantilla
              </button>
              <form onSubmit={onSubmit}>
                <div className={`dropzone ${fileName ? "has-file" : ""}`}>
                  <div className="dropzone-icon"><UploadIcon size={20} /></div>
                  <b>{fileName || "Arrastra tu archivo CSV aquí"}</b>
                  <span>{fileName ? "Haz clic para elegir otro archivo" : "o haz clic para seleccionarlo (máx. 2 MB)"}</span>
                  <input
                    type="file"
                    name="file"
                    accept=".csv,text/csv"
                    required
                    onChange={(e) => {
                      setFileName(e.target.files?.[0]?.name ?? "");
                      setResult(null);
                    }}
                  />
                </div>
                <div className="form-actions">
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn" onClick={close}>Cerrar</button>
                  <button type="submit" className="btn btn-primary" disabled={pending || !fileName}>
                    {pending ? "Importando…" : "Importar"}
                  </button>
                </div>
              </form>
              {result && (
                <div style={{ marginTop: 16 }}>
                  {result.ok ? (
                    <div className="import-stats">
                      <div className="import-stat ok"><b>{result.creados}</b><span>Creados</span></div>
                      <div className="import-stat upd"><b>{result.actualizados}</b><span>Actualizados</span></div>
                      <div className="import-stat err"><b>{result.errores.length}</b><span>Con errores</span></div>
                    </div>
                  ) : (
                    <div className="notice notice-err" style={{ margin: 0 }}>{result.message}</div>
                  )}
                  {result.errores.length > 0 && (
                    <ul className="import-errors">
                      {result.errores.slice(0, 50).map((er, i) => (
                        <li key={i}>Fila {er.fila}: {er.motivo}</li>
                      ))}
                      {result.errores.length > 50 && <li>… y {result.errores.length - 50} más.</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

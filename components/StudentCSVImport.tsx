"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importStudentsCSV, ImportResult } from "@/app/estudiantes/import-actions";

const PLANTILLA =
  "nombre,matricula,carrera,seccion,email,telefono,inasistencias,rendimiento,evaluacionesPerdidas,riesgo,abandono\n" +
  "Ana Pérez Soto,2024-0001,Ingeniería Comercial,Sección A,ana.perez@alumnos.cl,+56912345678,2,medio,0,,no\n";

export default function StudentCSVImport() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function close() { setOpen(false); setResult(null); }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      setResult(await importStudentsCSV(fd));
      router.refresh();
    });
  }

  function descargarPlantilla() {
    const url = URL.createObjectURL(new Blob(["﻿" + PLANTILLA], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla-estudiantes.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>⬆ Importar CSV</button>
      {open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal-box">
            <div className="modal-head">
              <h2>Importar estudiantes desde CSV</h2>
              <button className="close-x" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Columnas obligatorias: <b>nombre, matricula, carrera</b>. Opcionales: seccion, email, telefono, inasistencias,
                rendimiento (alto/medio/bajo), evaluacionesPerdidas, riesgo (verde/amarillo/rojo), abandono (si/no).
                Si la matrícula ya existe, el estudiante se actualiza; si no, se crea. Acepta separador coma o punto y coma.
              </p>
              <button type="button" className="btn" onClick={descargarPlantilla} style={{ marginBottom: 14 }}>Descargar plantilla</button>
              <form onSubmit={onSubmit}>
                <div className="field">
                  <label>Archivo CSV</label>
                  <input type="file" name="file" accept=".csv,text/csv" required />
                </div>
                <div className="form-actions">
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn" onClick={close}>Cerrar</button>
                  <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Importando…" : "Importar"}</button>
                </div>
              </form>
              {result && (
                <div style={{ marginTop: 16, fontSize: 13.5 }}>
                  {result.ok ? (
                    <p style={{ margin: 0 }}>✅ <b>{result.creados}</b> creados · <b>{result.actualizados}</b> actualizados · <b>{result.errores.length}</b> con errores.</p>
                  ) : (
                    <p style={{ margin: 0, color: "var(--rojo)" }}>❌ {result.message}</p>
                  )}
                  {result.errores.length > 0 && (
                    <ul style={{ maxHeight: 160, overflowY: "auto", paddingLeft: 18 }}>
                      {result.errores.slice(0, 50).map((er, i) => <li key={i}>Fila {er.fila}: {er.motivo}</li>)}
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

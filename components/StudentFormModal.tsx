"use client";
import { useState } from "react";
import { createStudent, updateStudent, deleteStudent } from "@/app/estudiantes/actions";
import { useRouter } from "next/navigation";
import { MODALIDADES, ASISTENCIA_CRITICA } from "@/lib/logic";

type Student = {
  id: string; nombre: string; matricula: string; carrera: string; seccion?: string | null; email?: string | null; telefono?: string | null;
  asistencia: number; modalidad?: string | null; asistenciaMinima?: number | null; rendimiento: string; evaluacionesPerdidas: number; riesgoManual: string | null; abandono: boolean;
};

export default function StudentFormModal({ existing, trigger }: { existing?: Student; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = !!existing;
  // Tipo de materia: define con cuánta asistencia se aprueba (online = sin asistencia).
  const [modalidad, setModalidad] = useState(existing?.modalidad ?? "");
  const [minPersonal, setMinPersonal] = useState(String(existing?.modalidad === "otra" ? existing?.asistenciaMinima ?? "" : ""));
  const preset = MODALIDADES.find((m) => m.value === modalidad);
  const esOnline = modalidad === "online";
  const esOtra = modalidad === "otra";
  const minMostrado = esOtra ? minPersonal : preset?.min != null ? String(preset.min) : modalidad === "" ? String(ASISTENCIA_CRITICA) : "";

  async function handleSubmit(formData: FormData) {
    if (isEdit) await updateStudent(existing!.id, formData);
    else await createStudent(formData);
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!existing || !confirm("¿Eliminar este estudiante y todo su historial?")) return;
    await deleteStudent(existing.id);
    setOpen(false);
    router.push("/estudiantes");
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger ?? <button className="btn btn-primary">+ Agregar estudiante</button>}</span>
      {open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h2>{isEdit ? "Editar estudiante" : "Agregar estudiante"}</h2>
              <button className="close-x" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form action={handleSubmit}>
                <div className="field-row">
                  <div className="field"><label>Nombre completo *</label><input required name="nombre" defaultValue={existing?.nombre} /></div>
                  <div className="field"><label>Matrícula / ID *</label><input required name="matricula" defaultValue={existing?.matricula} /></div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Carrera *</label><input required name="carrera" defaultValue={existing?.carrera} /></div>
                  <div className="field"><label>Sección / Materia</label><input name="seccion" placeholder="Ej: Sección A, Cálculo II" defaultValue={existing?.seccion ?? ""} /></div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Email</label><input type="email" name="email" defaultValue={existing?.email ?? ""} /></div>
                  <div className="field"><label>Teléfono</label><input name="telefono" defaultValue={existing?.telefono ?? ""} /></div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Tipo de materia</label>
                    <select name="modalidad" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
                      <option value="">Sin definir (mínimo {ASISTENCIA_CRITICA}%)</option>
                      {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}{m.value !== "otra" ? ` — ${m.min === null ? "sin asistencia" : m.min + "%"}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Asistencia mínima para aprobar (%)</label>
                    <input
                      type="number" min={0} max={100} step="0.1" name="asistenciaMinima"
                      value={esOnline ? "" : minMostrado}
                      onChange={(e) => setMinPersonal(e.target.value)}
                      disabled={!esOtra}
                      placeholder={esOnline ? "No aplica (online)" : esOtra ? "Ej: 80" : ""}
                    />
                  </div>
                </div>
                {esOnline && <p className="muted" style={{ fontSize: 12, margin: "-4px 0 12px" }}>Las materias online no llevan asistencia: se evalúan solo por rendimiento y evaluaciones no rendidas.</p>}
                <div className="field-row">
                  <div className="field"><label>Asistencia (%)</label><input type="number" min={0} max={100} step="0.1" name="asistencia" defaultValue={existing?.asistencia ?? 100} disabled={esOnline} /></div>
                  <div className="field"><label>Evaluaciones no rendidas</label><input type="number" min={0} name="evaluacionesPerdidas" defaultValue={existing?.evaluacionesPerdidas ?? 0} /></div>
                </div>
                <div className="field">
                  <label>Rendimiento académico</label>
                  <select name="rendimiento" defaultValue={existing?.rendimiento ?? "medio"}>
                    <option value="alto">Alto</option><option value="medio">Medio</option><option value="bajo">Bajo</option>
                  </select>
                </div>
                <div className="field">
                  <label>Nivel de riesgo</label>
                  <select name="riesgoManual" defaultValue={existing?.riesgoManual ?? ""}>
                    <option value="">Calcular automáticamente</option>
                    <option value="verde">🟢 Sin riesgo</option>
                    <option value="amarillo">🟡 Riesgo medio</option>
                    <option value="rojo">🔴 Riesgo alto</option>
                  </select>
                </div>
                <div className="check-row">
                  <input type="checkbox" id="abandonoChk" name="abandono" defaultChecked={existing?.abandono} />
                  <label htmlFor="abandonoChk">Estudiante marcado como abandono</label>
                </div>
                <div className="form-actions">
                  {isEdit && <button type="button" className="btn btn-danger" onClick={handleDelete}>Eliminar estudiante</button>}
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{isEdit ? "Guardar cambios" : "Agregar estudiante"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

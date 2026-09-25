"use client";
import { useState } from "react";
import { createAtencion, updateAtencion, deleteAtencion } from "@/app/atenciones/actions";
import { useRouter } from "next/navigation";
import { TIPOS_ATENCION, AtencionDTO } from "@/lib/logic";

type StudentOpt = { id: string; nombre: string; matricula: string };

export default function AtencionFormModal({
  students, existing, presetStudentId, trigger,
}: { students: StudentOpt[]; existing?: AtencionDTO; presetStudentId?: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = !!existing;

  async function handleSubmit(formData: FormData) {
    if (isEdit) await updateAtencion(existing!.id, formData);
    else await createAtencion(formData);
    setOpen(false);
    router.refresh();
  }
  async function handleDelete() {
    if (!existing || !confirm("¿Eliminar esta atención?")) return;
    await deleteAtencion(existing.id);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger ?? <button className="btn btn-primary">+ Nueva atención</button>}</span>
      {open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h2>{isEdit ? "Editar atención" : "Registrar atención"}</h2>
              <button className="close-x" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form action={handleSubmit}>
                <div className="field">
                  <label>Estudiante *</label>
                  <select required name="studentId" defaultValue={existing?.studentId ?? presetStudentId ?? ""}>
                    {!existing && !presetStudentId && <option value="">Selecciona un estudiante</option>}
                    {students.map((s) => <option key={s.id} value={s.id}>{s.nombre} — {s.matricula}</option>)}
                  </select>
                </div>
                <div className="field-row">
                  <div className="field"><label>Fecha *</label><input required type="date" name="fecha" defaultValue={existing?.fecha ?? new Date().toISOString().slice(0, 10)} /></div>
                  <div className="field"><label>Responsable *</label><input required name="responsable" defaultValue={existing?.responsable} /></div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Tipo de atención *</label>
                    <select required name="tipo" defaultValue={existing?.tipo ?? TIPOS_ATENCION[0]}>
                      {TIPOS_ATENCION.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Duración (min) *</label><input required type="number" min={1} name="duracionMin" defaultValue={existing?.duracionMin ?? 30} /></div>
                </div>
                <div className="field"><label>Tema específico *</label><input required name="tema" defaultValue={existing?.tema} placeholder="Ej: Bajo rendimiento en Cálculo II" /></div>
                <div className="field"><label>Observaciones</label><textarea name="observaciones" defaultValue={existing?.observaciones ?? ""} /></div>
                <div className="field"><label>Acuerdos</label><textarea name="acuerdos" defaultValue={existing?.acuerdos ?? ""} /></div>
                <div className="field-row">
                  <div className="field">
                    <label>Estado del caso *</label>
                    <select required name="estado" defaultValue={existing?.estado ?? "abierto"}>
                      <option value="abierto">Abierto</option><option value="seguimiento">En seguimiento</option><option value="cerrado">Cerrado</option>
                    </select>
                  </div>
                  <div className="field"><label>Seguimiento comprometido</label><input type="date" name="fechaSeguimientoComprometido" defaultValue={existing?.fechaSeguimientoComprometido ?? ""} /></div>
                </div>
                <div className="check-row">
                  <input type="checkbox" id="pcChk" name="resueltoPrimerContacto" defaultChecked={existing?.resueltoPrimerContacto} />
                  <label htmlFor="pcChk">Se resolvió en el primer contacto</label>
                </div>
                {existing?.fechaSeguimientoComprometido && (
                  <div className="check-row">
                    <input type="checkbox" id="scChk" name="seguimientoCumplido" defaultChecked={!!existing?.seguimientoCumplido} />
                    <label htmlFor="scChk">El seguimiento comprometido se cumplió</label>
                  </div>
                )}
                <div className="form-actions">
                  {isEdit && <button type="button" className="btn btn-danger" onClick={handleDelete}>Eliminar</button>}
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{isEdit ? "Guardar cambios" : "Registrar atención"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

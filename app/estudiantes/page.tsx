import { prisma } from "@/lib/prisma";
import { computeRisk, StudentDTO, AtencionDTO } from "@/lib/logic";
import { RiskChip, initials, fmtDate, Topbar } from "@/components/ui";
import StudentFormModal from "@/components/StudentFormModal";
import Link from "next/link";

export default async function EstudiantesPage() {
  const [studentsRaw, atencionesRaw] = await Promise.all([prisma.student.findMany(), prisma.atencion.findMany()]);
  const students: StudentDTO[] = studentsRaw.map((s) => ({ ...s, rendimiento: s.rendimiento as any, riesgoManual: s.riesgoManual as any }));
  const atenciones: AtencionDTO[] = atencionesRaw.map((a) => ({
    ...a, estado: a.estado as any, fecha: a.fecha.toISOString().slice(0, 10),
    fechaSeguimientoComprometido: a.fechaSeguimientoComprometido?.toISOString().slice(0, 10) ?? null,
    fechaCierre: a.fechaCierre?.toISOString().slice(0, 10) ?? null, updatedAt: a.updatedAt.toISOString().slice(0, 10),
  }));

  return (
    <>
      <Topbar title="Estudiantes" subtitle="Registro y ficha de cada estudiante en seguimiento." action={<StudentFormModal />} />
      <div className="content">
        <div className="card">
          {students.length === 0 ? (
            <div className="empty-state">Aún no hay estudiantes registrados. Agrega el primero con el botón de arriba.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Estudiante</th><th>Carrera</th><th>Sección</th><th>Riesgo</th><th>Atenciones</th><th>Última atención</th><th></th></tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const risk = computeRisk(s, atenciones);
                  const atS = atenciones.filter((a) => a.studentId === s.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
                  return (
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
                      <td><RiskChip level={risk.level} /></td>
                      <td>{atS.length}</td>
                      <td className="muted">{atS.length ? fmtDate(atS[0].fecha) : "—"}</td>
                      <td style={{ textAlign: "right" }}><Link href={`/estudiantes/${s.id}`} className="muted">Ver ficha →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

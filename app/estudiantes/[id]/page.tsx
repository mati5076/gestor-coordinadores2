import { prisma } from "@/lib/prisma";
import { computeRisk, StudentDTO, AtencionDTO } from "@/lib/logic";
import { RiskChip, EstadoBadge, initials, fmtDate, Topbar } from "@/components/ui";
import StudentFormModal from "@/components/StudentFormModal";
import AtencionFormModal from "@/components/AtencionFormModal";
import { notFound } from "next/navigation";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const [studentRaw, atencionesRaw, allStudentsRaw] = await Promise.all([
    prisma.student.findUnique({ where: { id: params.id } }),
    prisma.atencion.findMany({ where: { studentId: params.id }, orderBy: { fecha: "desc" } }),
    prisma.student.findMany(),
  ]);
  if (!studentRaw) notFound();

  const student: StudentDTO = { ...studentRaw, rendimiento: studentRaw.rendimiento as any, riesgoManual: studentRaw.riesgoManual as any };
  const allAtenciones: AtencionDTO[] = (await prisma.atencion.findMany()).map((a) => ({
    ...a, estado: a.estado as any, fecha: a.fecha.toISOString().slice(0, 10),
    fechaSeguimientoComprometido: a.fechaSeguimientoComprometido?.toISOString().slice(0, 10) ?? null,
    fechaCierre: a.fechaCierre?.toISOString().slice(0, 10) ?? null, updatedAt: a.updatedAt.toISOString().slice(0, 10),
  }));
  const historial = atencionesRaw.map((a) => allAtenciones.find((x) => x.id === a.id)!);
  const risk = computeRisk(student, allAtenciones);

  return (
    <>
      <Topbar title="Ficha del estudiante" subtitle={`${student.matricula} · ${student.carrera}${student.seccion ? " · " + student.seccion : ""}`} />
      <div className="content" style={{ maxWidth: 780 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
          <div className="avatar" style={{ width: 46, height: 46, fontSize: 15 }}>{initials(student.nombre)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Lexend", fontWeight: 600, fontSize: 16 }}>{student.nombre}</div>
            <div style={{ marginTop: 8 }}><RiskChip level={risk.level} /></div>
          </div>
          <StudentFormModal existing={student} trigger={<button className="btn">Editar</button>} />
        </div>

        <div className="card card-pad" style={{ marginBottom: 16, background: "#FAFBFC" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>FACTORES DE RIESGO</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {risk.reasons.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
          </ul>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Historial de atenciones</h3>
          <AtencionFormModal students={[student]} presetStudentId={student.id} trigger={<button className="btn btn-primary">+ Nueva atención</button>} />
        </div>

        {historial.length === 0 ? (
          <div className="empty-state">Sin atenciones registradas todavía.</div>
        ) : (
          <div className="timeline">
            {historial.map((a, i) => (
              <div className="tl-item" key={a.id}>
                <div className="tl-dot-wrap">
                  <div className="tl-dot" />
                  {i < historial.length - 1 && <div className="tl-line" />}
                </div>
                <div className="tl-card">
                  <div className="tl-head"><b>{a.tema}</b><EstadoBadge estado={a.estado} /></div>
                  <div className="tl-meta">{fmtDate(a.fecha)} · {a.tipo} · {a.duracionMin} min · {a.responsable}</div>
                  {a.observaciones && <div style={{ fontSize: 12.5, marginTop: 5 }}>{a.observaciones}</div>}
                  {a.acuerdos && <div style={{ fontSize: 12.5, marginTop: 5 }}><b>Acuerdo:</b> {a.acuerdos}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

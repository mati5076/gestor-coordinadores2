import { prisma } from "@/lib/prisma";
import { computeAlerts, RiskLevel, StudentDTO, AtencionDTO } from "@/lib/logic";
import { Topbar } from "@/components/ui";
import AlertList, { AlertGroup } from "@/components/AlertList";

const RISK_ORDER: Record<RiskLevel, number> = { rojo: 0, amarillo: 1, verde: 2 };

export default async function AlertasPage() {
  const [studentsRaw, atencionesRaw] = await Promise.all([prisma.student.findMany(), prisma.atencion.findMany()]);
  const students: StudentDTO[] = studentsRaw.map((s) => ({ ...s, rendimiento: s.rendimiento as any, riesgoManual: s.riesgoManual as any }));
  const atenciones: AtencionDTO[] = atencionesRaw.map((a) => ({
    ...a, estado: a.estado as any, fecha: a.fecha.toISOString().slice(0, 10),
    fechaSeguimientoComprometido: a.fechaSeguimientoComprometido?.toISOString().slice(0, 10) ?? null,
    fechaCierre: a.fechaCierre?.toISOString().slice(0, 10) ?? null, updatedAt: a.updatedAt.toISOString().slice(0, 10),
  }));

  // computeAlerts() sigue devolviendo una alerta por motivo (para el resumen
  // del dashboard). Acá las agrupamos por estudiante: un caso crítico con
  // 5 motivos debe verse como 1 tarjeta priorizada, no como 5 filas sueltas.
  const rawAlerts = computeAlerts(students, atenciones);
  const groupedMap = new Map<string, AlertGroup>();
  for (const a of rawAlerts) {
    const s = students.find((st) => st.id === a.studentId);
    if (!s) continue;
    if (!groupedMap.has(a.studentId)) {
      groupedMap.set(a.studentId, { studentId: s.id, nombre: s.nombre, carrera: s.carrera, seccion: s.seccion, matricula: s.matricula, risk: a.risk, reasons: [] });
    }
    groupedMap.get(a.studentId)!.reasons.push({ ic: a.ic, tipo: a.tipo, detalle: a.detalle });
  }
  const groups = Array.from(groupedMap.values()).sort((a, b) => {
    const byRisk = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
    return byRisk !== 0 ? byRisk : b.reasons.length - a.reasons.length; // más motivos = más urgente
  });

  const riesgoAlto = groups.filter((g) => g.risk === "rojo").length;
  const riesgoMedio = groups.filter((g) => g.risk === "amarillo").length;

  return (
    <>
      <Topbar title="Alertas" subtitle="Estudiantes priorizados que requieren revisión o intervención." />
      <div className="content">
        <div className="grid kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 18 }}>
          <div className="card kpi-card">
            <span className="kpi-label">🚨 Estudiantes con alerta</span>
            <span className="kpi-value">{groups.length}</span>
            <span className="kpi-sub">requieren revisión</span>
          </div>
          <div className="card kpi-card">
            <span className="kpi-label">🔴 Riesgo alto</span>
            <span className="kpi-value">{riesgoAlto}</span>
            <span className="kpi-sub">prioridad de intervención inmediata</span>
          </div>
          <div className="card kpi-card">
            <span className="kpi-label">🟡 Riesgo medio</span>
            <span className="kpi-value">{riesgoMedio}</span>
            <span className="kpi-sub">a seguir de cerca</span>
          </div>
        </div>

        <AlertList groups={groups} />
      </div>
    </>
  );
}

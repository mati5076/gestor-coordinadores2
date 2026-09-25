import { prisma } from "@/lib/prisma";
import { computeKPIs, computeAlerts, StudentDTO, AtencionDTO } from "@/lib/logic";
import { Topbar, RiskChip } from "@/components/ui";
import { TipoDuracionChart, EstadoCasosChart } from "@/components/DashboardCharts";
import Link from "next/link";

// Server Component: los datos se leen directamente de la base de datos en el
// servidor con Prisma, sin necesidad de exponer una API REST intermedia.
export default async function DashboardPage() {
  const [studentsRaw, atencionesRaw] = await Promise.all([
    prisma.student.findMany(),
    prisma.atencion.findMany(),
  ]);

  // Normalizamos fechas a "YYYY-MM-DD" para que coincidan con lib/logic.ts
  const students: StudentDTO[] = studentsRaw.map((s) => ({
    ...s,
    rendimiento: s.rendimiento as StudentDTO["rendimiento"],
    riesgoManual: s.riesgoManual as StudentDTO["riesgoManual"],
  }));
  const atenciones: AtencionDTO[] = atencionesRaw.map((a) => ({
    ...a,
    estado: a.estado as AtencionDTO["estado"],
    fecha: a.fecha.toISOString().slice(0, 10),
    fechaSeguimientoComprometido: a.fechaSeguimientoComprometido?.toISOString().slice(0, 10) ?? null,
    fechaCierre: a.fechaCierre?.toISOString().slice(0, 10) ?? null,
    updatedAt: a.updatedAt.toISOString().slice(0, 10),
  }));

  const k = computeKPIs(students, atenciones);
  const alerts = computeAlerts(students, atenciones);

  return (
    <>
      <Topbar title="Panel general" subtitle="Resumen de indicadores clave y estado general del proceso." />
      <div className="content">
        <div className="grid kpi-grid" style={{ marginBottom: 18 }}>
          <Kpi label="👥 Estudiantes en riesgo" value={k.riskDist.rojo + k.riskDist.amarillo} sub={`${k.riskDist.rojo} en riesgo alto · ${k.riskDist.amarillo} en riesgo medio`} />
          <Kpi label="📂 Casos cerrados" value={`${k.pctCerrados}%`} sub={`${k.nCerrados} de ${k.totalAtenciones} atenciones`} />
          <Kpi label="✅ Resolución 1er contacto" value={`${k.tasaPrimerContacto}%`} sub="de las atenciones registradas" />
          <Kpi label="🔁 Cumplimiento de seguimiento" value={k.tasaCumplimiento === null ? "—" : `${k.tasaCumplimiento}%`} sub={`${k.conSeguimientoCount} compromiso(s) evaluado(s)`} />
        </div>
        <div className="grid kpi-grid" style={{ marginBottom: 22 }}>
          <Kpi label="📈 Atenciones por estudiante" value={k.promAtencionesPorEstudiante.toFixed(1)} sub={`promedio · ${k.totalAtenciones} atenciones totales`} />
          <Kpi label="⏱ Tiempo promedio de atención" value={`${k.tiempoPromedioGeneral} min`} sub="promedio general por atención" />
          <Kpi label="📆 Tiempo de resolución" value={k.tiempoResolucion === null ? "—" : `${k.tiempoResolucion} días`} sub="promedio en casos cerrados" />
          <Kpi label="🔄 Reincidencia de consultas" value={`${k.tasaReincidencia}%`} sub="estudiantes con mismo tema recurrente" />
        </div>

        <div className="grid two-col" style={{ marginBottom: 18 }}>
          <div className="card card-pad">
            <h3 className="section-title">Tiempo promedio por tipo de requerimiento</h3>
            <p className="section-sub">Minutos promedio por atención, según tipo</p>
            <TipoDuracionChart data={k.tiempoPromedioPorTipo} />
          </div>
          <div className="card card-pad">
            <h3 className="section-title">Estado de los casos</h3>
            <p className="section-sub">Distribución abiertos / en seguimiento / cerrados</p>
            <EstadoCasosChart abiertos={k.nAbiertos} seguimiento={k.nSeguimiento} cerrados={k.nCerrados} />
          </div>
        </div>

        <div className="grid two-col">
          <div className="card card-pad">
            <h3 className="section-title">⚑ Alertas prioritarias</h3>
            <p className="section-sub">Casos que requieren revisión, ordenados por nivel de riesgo</p>
            {alerts.length === 0 ? (
              <div className="empty-state">✅ Sin alertas activas.</div>
            ) : (
              alerts.slice(0, 6).map((a, i) => {
                const s = students.find((st) => st.id === a.studentId);
                return (
                  <div className="alert-item" key={i}>
                    <span className="alert-dot" style={{ background: `var(--${a.risk})` }} />
                    <div className="alert-body">
                      <b>{s?.nombre ?? "—"}</b>
                      <p>{a.ic} {a.tipo} — {a.detalle}</p>
                    </div>
                    <RiskChip level={a.risk} />
                  </div>
                );
              })
            )}
            {alerts.length > 6 && (
              <div style={{ marginTop: 12 }}>
                <Link href="/alertas" className="btn">Ver las {alerts.length} alertas →</Link>
              </div>
            )}
          </div>
          <div className="card card-pad">
            <h3 className="section-title">👤 Estudiantes con más atenciones</h3>
            {k.topEstudiantes.length === 0 ? (
              <div className="empty-state">Sin datos aún.</div>
            ) : (
              k.topEstudiantes.map((t) => (
                <div key={t.studentId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.nombre}</span>
                  <span className="muted" style={{ fontSize: 12.5 }}>{t.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card kpi-card">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

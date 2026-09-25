import { prisma } from "@/lib/prisma";
import { AtencionDTO } from "@/lib/logic";
import { EstadoBadge, fmtDate, Topbar } from "@/components/ui";
import AtencionFormModal from "@/components/AtencionFormModal";

export default async function AtencionesPage() {
  const [studentsRaw, atencionesRaw] = await Promise.all([
    prisma.student.findMany({ orderBy: { nombre: "asc" } }),
    prisma.atencion.findMany({ orderBy: { fecha: "desc" } }),
  ]);
  const atenciones: AtencionDTO[] = atencionesRaw.map((a) => ({
    ...a, estado: a.estado as any, fecha: a.fecha.toISOString().slice(0, 10),
    fechaSeguimientoComprometido: a.fechaSeguimientoComprometido?.toISOString().slice(0, 10) ?? null,
    fechaCierre: a.fechaCierre?.toISOString().slice(0, 10) ?? null, updatedAt: a.updatedAt.toISOString().slice(0, 10),
  }));

  return (
    <>
      <Topbar title="Atenciones" subtitle="Historial estructurado de cada atención realizada."
        action={<AtencionFormModal students={studentsRaw} />} />
      <div className="content">
        <div className="card">
          {atenciones.length === 0 ? (
            <div className="empty-state">Aún no hay atenciones registradas.</div>
          ) : (
            <table>
              <thead><tr><th>Fecha</th><th>Estudiante</th><th>Tipo</th><th>Tema</th><th>Duración</th><th>Responsable</th><th>Estado</th></tr></thead>
              <tbody>
                {atenciones.map((a) => {
                  const s = studentsRaw.find((st) => st.id === a.studentId);
                  return (
                    <tr key={a.id}>
                      <td className="muted">{fmtDate(a.fecha)}</td>
                      <td style={{ fontWeight: 600 }}>{s?.nombre ?? "—"}</td>
                      <td>{a.tipo}</td>
                      <td>{a.tema}</td>
                      <td className="muted">{a.duracionMin} min</td>
                      <td className="muted">{a.responsable}</td>
                      <td><EstadoBadge estado={a.estado} /></td>
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

import { prisma } from "@/lib/prisma";
import { computeRisk, StudentDTO, AtencionDTO } from "@/lib/logic";
import { Topbar } from "@/components/ui";
import StudentFormModal from "@/components/StudentFormModal";
import StudentCSVImport from "@/components/StudentCSVImport";
import StudentsView from "@/components/StudentsView";
import type { StudentRow, AtencionRow } from "@/components/StudentExport";

export const dynamic = "force-dynamic";

export default async function EstudiantesPage() {
  const [studentsRaw, atencionesRaw] = await Promise.all([prisma.student.findMany({ orderBy: { nombre: "asc" } }), prisma.atencion.findMany()]);
  const students: StudentDTO[] = studentsRaw.map((s) => ({ ...s, rendimiento: s.rendimiento as any, riesgoManual: s.riesgoManual as any }));
  const atenciones: AtencionDTO[] = atencionesRaw.map((a) => ({
    ...a, estado: a.estado as any, fecha: a.fecha.toISOString().slice(0, 10),
    fechaSeguimientoComprometido: a.fechaSeguimientoComprometido?.toISOString().slice(0, 10) ?? null,
    fechaCierre: a.fechaCierre?.toISOString().slice(0, 10) ?? null, updatedAt: a.updatedAt.toISOString().slice(0, 10),
  }));

  // Todo se calcula aquí, en el servidor; el componente cliente solo busca, filtra y exporta.
  const rows: StudentRow[] = students.map((s) => {
    const ats = atenciones.filter((a) => a.studentId === s.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return {
      id: s.id, nombre: s.nombre, matricula: s.matricula, carrera: s.carrera, seccion: s.seccion ?? null, email: s.email ?? null,
      telefono: s.telefono ?? null, asistencia: s.asistencia, rendimiento: s.rendimiento, evaluacionesPerdidas: s.evaluacionesPerdidas,
      riesgoManual: s.riesgoManual, abandono: s.abandono,
      riesgo: computeRisk(s, atenciones).level, nAtenciones: ats.length, ultimaAtencion: ats[0]?.fecha ?? null,
    };
  });
  const atRows: AtencionRow[] = atencionesRaw.map((a) => ({
    studentId: a.studentId, fecha: a.fecha.toISOString().slice(0, 10), responsable: a.responsable, tipo: a.tipo, tema: a.tema,
    duracionMin: a.duracionMin, estado: a.estado, resueltoPrimerContacto: a.resueltoPrimerContacto,
    fechaSeguimientoComprometido: a.fechaSeguimientoComprometido?.toISOString().slice(0, 10) ?? null,
    fechaCierre: a.fechaCierre?.toISOString().slice(0, 10) ?? null, observaciones: a.observaciones, acuerdos: a.acuerdos,
  }));

  return (
    <>
      <Topbar
        title="Estudiantes"
        subtitle="Registro y ficha de cada estudiante en seguimiento."
        action={
          <div className="topbar-actions">
            <StudentCSVImport />
            <StudentFormModal />
          </div>
        }
      />
      <div className="content">
        <StudentsView students={rows} atenciones={atRows} />
      </div>
    </>
  );
}

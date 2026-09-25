import { prisma } from "@/lib/prisma";
import { computeRisk, StudentDTO, AtencionDTO } from "@/lib/logic";

export type RiskyStudent = { id: string; nombre: string };

/**
 * Estudiantes actualmente en riesgo (medio o alto, sin abandono registrado)
 * — el mismo criterio "riesgo != verde" que ya usa el resto de la app
 * (ver KPI "Estudiantes en riesgo" en el panel general).
 * Se usa para la alerta emergente global (ver components/RiskAlertToasts.tsx).
 */
export async function getHighRiskStudents(): Promise<RiskyStudent[]> {
  const [studentsRaw, atencionesRaw] = await Promise.all([
    prisma.student.findMany(),
    prisma.atencion.findMany(),
  ]);

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

  return students
    .filter((s) => !s.abandono && computeRisk(s, atenciones).level !== "verde")
    .map((s) => ({ id: s.id, nombre: s.nombre }));
}

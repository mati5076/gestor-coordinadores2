// ============================================================================
// Lógica de negocio: nivel de riesgo, alertas automáticas y KPIs.
// Puro TypeScript sin dependencias de Prisma ni de React — recibe arreglos
// planos (los mismos shapes que devuelve la base de datos, con fechas como
// strings "YYYY-MM-DD") y devuelve datos listos para renderizar.
// Es exactamente la misma lógica de la versión inicial en HTML, portada
// a tipos. Si agregas una regla de alerta nueva, este es el único lugar
// que debes tocar.
// ============================================================================

export type RiskLevel = "verde" | "amarillo" | "rojo";

export type StudentDTO = {
  id: string;
  nombre: string;
  matricula: string;
  carrera: string;
  seccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  asistencia: number; // porcentaje de asistencia (0–100)
  modalidad?: string | null; // electiva | practica | semipresencial | online | otra | null
  asistenciaMinima?: number | null; // % mínimo para aprobar la materia (null = online / sin definir)
  rendimiento: "alto" | "medio" | "bajo";
  evaluacionesPerdidas: number;
  riesgoManual: RiskLevel | null;
  abandono: boolean;
};

export type AtencionDTO = {
  id: string;
  studentId: string;
  fecha: string; // YYYY-MM-DD
  responsable: string;
  tipo: string;
  tema: string;
  duracionMin: number;
  observaciones?: string | null;
  acuerdos?: string | null;
  estado: "abierto" | "seguimiento" | "cerrado";
  resueltoPrimerContacto: boolean;
  fechaSeguimientoComprometido: string | null;
  seguimientoCumplido: boolean | null;
  fechaCierre: string | null;
  updatedAt: string;
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  verde: "Sin riesgo",
  amarillo: "Riesgo medio",
  rojo: "Riesgo alto",
};

/** Mínimo de asistencia que se usa si la materia no tiene modalidad definida (comportamiento anterior). */
export const ASISTENCIA_CRITICA = 75;
/** Puntos porcentuales sobre el mínimo hasta los que la asistencia se considera "baja" (riesgo medio). */
export const ASISTENCIA_MARGEN = 10;

export type Modalidad = "electiva" | "practica" | "semipresencial" | "online" | "otra";

/** Tipos de materia y la asistencia con la que se aprueban. `min: null` = sin asistencia (solo se evalúa). */
export const MODALIDADES: { value: Modalidad; label: string; min: number | null; desc: string }[] = [
  { value: "electiva", label: "Electiva presencial", min: 50, desc: "se aprueba con 50 % de asistencia" },
  { value: "practica", label: "Práctica", min: 60, desc: "se aprueba con 60 % de asistencia" },
  { value: "semipresencial", label: "Semipresencial", min: 70, desc: "se aprueba con 70 % de asistencia" },
  { value: "online", label: "Online", min: null, desc: "sin asistencia; solo se evalúa" },
  { value: "otra", label: "Otra (mínimo personalizado)", min: null, desc: "tú defines el mínimo" },
];

export const modalidadLabel = (m: string | null | undefined) => MODALIDADES.find((x) => x.value === m)?.label ?? "Sin definir";

/** Materias online: no llevan asistencia, así que no cuenta para el riesgo ni para las alertas. */
export const sinAsistencia = (s: Pick<StudentDTO, "modalidad">) => s.modalidad === "online";

/** % mínimo de asistencia para aprobar la materia del estudiante (null si es online). */
export function asistenciaMinimaDe(s: Pick<StudentDTO, "modalidad" | "asistenciaMinima">): number | null {
  if (s.modalidad === "online") return null;
  return s.asistenciaMinima ?? ASISTENCIA_CRITICA;
}

export type AsistenciaEstado = "na" | "critica" | "baja" | "normal";

/** Estado de la asistencia frente al mínimo de su materia: crítica (bajo el mínimo), baja (a menos de 10 puntos) o normal. */
export function asistenciaEstado(s: Pick<StudentDTO, "modalidad" | "asistenciaMinima" | "asistencia">): AsistenciaEstado {
  const min = asistenciaMinimaDe(s);
  if (min === null) return "na";
  if (s.asistencia < min) return "critica";
  if (s.asistencia < min + ASISTENCIA_MARGEN) return "baja";
  return "normal";
}

/** Muestra un porcentaje sin ceros sobrantes: 82 → "82%", 82.5 → "82,5%". */
export function fmtPct(n: number) {
  return `${Number.isInteger(n) ? n : n.toFixed(1).replace(".", ",")}%`;
}

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);

/** Calcula el nivel de riesgo de un estudiante (o usa el override manual). */
export function computeRisk(student: StudentDTO, atenciones: AtencionDTO[]): { level: RiskLevel; manual: boolean; reasons: string[] } {
  if (student.riesgoManual) {
    return { level: student.riesgoManual, manual: true, reasons: ["Nivel asignado manualmente."] };
  }
  const reasons: string[] = [];
  let score = 0;

  const asisEstado = asistenciaEstado(student);
  const asisMin = asistenciaMinimaDe(student);
  if (asisEstado === "critica") {
    score = Math.max(score, 2);
    reasons.push(`Asistencia crítica (${fmtPct(student.asistencia)}, mínimo ${asisMin}%).`);
  } else if (asisEstado === "baja") {
    score = Math.max(score, 1);
    reasons.push(`Asistencia baja (${fmtPct(student.asistencia)}, mínimo ${asisMin}%).`);
  }

  if (student.rendimiento === "bajo") {
    score = Math.max(score, 2);
    reasons.push("Bajo rendimiento académico.");
  } else if (student.rendimiento === "medio") {
    score = Math.max(score, 1);
    reasons.push("Rendimiento académico medio.");
  }

  if (student.evaluacionesPerdidas >= 2) {
    score = Math.max(score, 2);
    reasons.push(`${student.evaluacionesPerdidas} evaluaciones no rendidas.`);
  } else if (student.evaluacionesPerdidas >= 1) {
    score = Math.max(score, 1);
    reasons.push("1 evaluación no rendida.");
  }

  const abiertas = atenciones.filter((a) => a.studentId === student.id && a.estado !== "cerrado").length;
  if (abiertas >= 3) {
    score = Math.max(score, 2);
    reasons.push(`${abiertas} casos abiertos simultáneos.`);
  } else if (abiertas === 2) {
    score = Math.max(score, 1);
    reasons.push("2 casos abiertos simultáneos.");
  }

  if (reasons.length === 0) reasons.push("Sin factores de riesgo registrados.");
  const level: RiskLevel = score >= 2 ? "rojo" : score === 1 ? "amarillo" : "verde";
  return { level, manual: false, reasons };
}

export type Alert = {
  studentId: string;
  tipo: string;
  detalle: string;
  risk: RiskLevel;
  ic: string;
};

const RISK_ORDER: Record<RiskLevel, number> = { rojo: 0, amarillo: 1, verde: 2 };

/** Genera alertas automáticas a partir de las reglas del negocio. */
export function computeAlerts(students: StudentDTO[], atenciones: AtencionDTO[], diasSinSeguimiento = 10): Alert[] {
  const alerts: Alert[] = [];
  const today = todayStr();

  for (const s of students) {
    if (s.abandono) continue;
    const risk = computeRisk(s, atenciones).level;
    const asisEstado = asistenciaEstado(s);
    if (asisEstado === "critica" || asisEstado === "baja") alerts.push({ studentId: s.id, tipo: "Asistencia baja", detalle: `${fmtPct(s.asistencia)} de asistencia (mínimo ${asistenciaMinimaDe(s)}%).`, risk, ic: "📅" });
    if (s.rendimiento === "bajo") alerts.push({ studentId: s.id, tipo: "Bajo rendimiento académico", detalle: "Rendimiento clasificado como bajo.", risk, ic: "📉" });
    if (s.evaluacionesPerdidas >= 1) alerts.push({ studentId: s.id, tipo: "Evaluaciones no rendidas", detalle: `${s.evaluacionesPerdidas} evaluación(es) no rendida(s).`, risk, ic: "📝" });
  }

  for (const a of atenciones) {
    if (a.estado === "cerrado") continue;
    const overdue = !!a.fechaSeguimientoComprometido && a.fechaSeguimientoComprometido < today;
    const stale = daysBetween(a.updatedAt || a.fecha, today) >= diasSinSeguimiento;
    if (overdue || stale) {
      const s = students.find((st) => st.id === a.studentId);
      if (!s) continue;
      alerts.push({
        studentId: a.studentId,
        tipo: overdue ? "Seguimiento comprometido vencido" : `Caso sin seguimiento hace ${daysBetween(a.updatedAt || a.fecha, today)} días`,
        detalle: a.tema,
        risk: computeRisk(s, atenciones).level,
        ic: "⏰",
      });
    }
  }

  return alerts.sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]);
}

export type KPIs = {
  totalAtenciones: number;
  totalStudents: number;
  promAtencionesPorEstudiante: number;
  topEstudiantes: { studentId: string; nombre: string; count: number }[];
  tiempoPromedioPorTipo: { tipo: string; prom: number; n: number }[];
  tiempoPromedioGeneral: number;
  tiempoResolucion: number | null;
  tasaPrimerContacto: number;
  nCerrados: number;
  nAbiertos: number;
  nSeguimiento: number;
  pctCerrados: number;
  tasaReincidencia: number;
  topMotivos: [string, number][];
  tasaAbandono: number;
  conRiesgoCount: number;
  tasaCumplimiento: number | null;
  conSeguimientoCount: number;
  riskDist: Record<RiskLevel, number>;
};

/** Calcula los 8 KPIs clave a partir de un conjunto de atenciones (ya filtrado por período si aplica). */
export function computeKPIs(students: StudentDTO[], atenciones: AtencionDTO[]): KPIs {
  const totalAtenciones = atenciones.length;
  const totalStudents = students.length;

  // 1. Cantidad de atenciones por estudiante
  const porEstudiante: Record<string, number> = {};
  atenciones.forEach((a) => (porEstudiante[a.studentId] = (porEstudiante[a.studentId] || 0) + 1));
  const promAtencionesPorEstudiante = totalStudents ? totalAtenciones / totalStudents : 0;
  const topEstudiantes = Object.entries(porEstudiante)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ studentId: id, nombre: students.find((s) => s.id === id)?.nombre ?? "—", count }));

  // 2. Tiempo promedio de atención por tipo
  const porTipo: Record<string, { sum: number; n: number }> = {};
  atenciones.forEach((a) => {
    porTipo[a.tipo] = porTipo[a.tipo] || { sum: 0, n: 0 };
    porTipo[a.tipo].sum += a.duracionMin || 0;
    porTipo[a.tipo].n++;
  });
  const tiempoPromedioPorTipo = Object.entries(porTipo).map(([tipo, v]) => ({ tipo, prom: v.n ? Math.round(v.sum / v.n) : 0, n: v.n }));
  const tiempoPromedioGeneral = totalAtenciones ? Math.round(atenciones.reduce((s, a) => s + (a.duracionMin || 0), 0) / totalAtenciones) : 0;

  // 3. Tiempo de resolución de casos cerrados
  const cerrados = atenciones.filter((a) => a.estado === "cerrado" && a.fechaCierre);
  const tiempoResolucion = cerrados.length
    ? Math.round(cerrados.reduce((s, a) => s + daysBetween(a.fecha, a.fechaCierre as string), 0) / cerrados.length)
    : null;

  // 4. Tasa de resolución en primer contacto
  const resueltosPrimerContacto = atenciones.filter((a) => a.resueltoPrimerContacto).length;
  const tasaPrimerContacto = totalAtenciones ? Math.round((resueltosPrimerContacto / totalAtenciones) * 100) : 0;

  // 5. Casos cerrados vs abiertos
  const nCerrados = atenciones.filter((a) => a.estado === "cerrado").length;
  const nAbiertos = atenciones.filter((a) => a.estado === "abierto").length;
  const nSeguimiento = atenciones.filter((a) => a.estado === "seguimiento").length;
  const pctCerrados = totalAtenciones ? Math.round((nCerrados / totalAtenciones) * 100) : 0;

  // 6. Reincidencia de consultas (mismo tema)
  const temaPorEstudiante: Record<string, Record<string, number>> = {};
  atenciones.forEach((a) => {
    const tema = (a.tema || "").trim().toLowerCase();
    if (!tema) return;
    temaPorEstudiante[a.studentId] = temaPorEstudiante[a.studentId] || {};
    temaPorEstudiante[a.studentId][tema] = (temaPorEstudiante[a.studentId][tema] || 0) + 1;
  });
  let reincidentes = 0,
    conAtencion = 0;
  Object.values(temaPorEstudiante).forEach((temas) => {
    conAtencion++;
    if (Object.values(temas).some((c) => c > 1)) reincidentes++;
  });
  const tasaReincidencia = conAtencion ? Math.round((reincidentes / conAtencion) * 100) : 0;

  const conteoTemas: Record<string, number> = {};
  atenciones.forEach((a) => {
    const t = (a.tema || "Sin especificar").trim();
    conteoTemas[t] = (conteoTemas[t] || 0) + 1;
  });
  const topMotivos = Object.entries(conteoTemas).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];

  // 7. Tasa de abandono asociada a estudiantes con alertas (riesgo != verde)
  const conRiesgo = students.filter((s) => computeRisk(s, atenciones).level !== "verde");
  const abandonoEntreRiesgo = conRiesgo.filter((s) => s.abandono).length;
  const tasaAbandono = conRiesgo.length ? Math.round((abandonoEntreRiesgo / conRiesgo.length) * 100) : 0;

  // 8. Cumplimiento de seguimiento comprometido
  const today = todayStr();
  const conSeguimiento = atenciones.filter((a) => a.fechaSeguimientoComprometido && a.fechaSeguimientoComprometido <= today);
  const cumplidos = conSeguimiento.filter((a) => a.seguimientoCumplido === true);
  const tasaCumplimiento = conSeguimiento.length ? Math.round((cumplidos.length / conSeguimiento.length) * 100) : null;

  const riskDist: Record<RiskLevel, number> = { verde: 0, amarillo: 0, rojo: 0 };
  students.forEach((s) => riskDist[computeRisk(s, atenciones).level]++);

  return {
    totalAtenciones, totalStudents, promAtencionesPorEstudiante, topEstudiantes,
    tiempoPromedioPorTipo, tiempoPromedioGeneral, tiempoResolucion, tasaPrimerContacto,
    nCerrados, nAbiertos, nSeguimiento, pctCerrados, tasaReincidencia, topMotivos,
    tasaAbandono, conRiesgoCount: conRiesgo.length, tasaCumplimiento, conSeguimientoCount: conSeguimiento.length,
    riskDist,
  };
}

export const TIPOS_ATENCION = ["Académica", "Financiera", "Personal", "Psicosocial", "Otra"] as const;
export const AREAS_DERIVACION = ["Apoyo académico", "Área psicosocial", "Financiamiento / Aranceles", "Otra"] as const;

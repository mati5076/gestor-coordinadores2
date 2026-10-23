"use server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parseCSV } from "@/lib/csv";
import { revalidatePath } from "next/cache";

export type ImportResult = {
  ok: boolean;
  message?: string;
  creados: number;
  actualizados: number;
  errores: { fila: number; motivo: string }[];
};

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_FILAS = 5000;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Encabezados aceptados (normalizados) -> campo interno
const ALIASES: Record<string, string> = {
  nombre: "nombre", "nombre completo": "nombre", estudiante: "nombre",
  matricula: "matricula", id: "matricula", "matricula id": "matricula", rut: "matricula",
  carrera: "carrera",
  seccion: "seccion", materia: "seccion", "seccion materia": "seccion",
  email: "email", correo: "email", "correo electronico": "email",
  telefono: "telefono", celular: "telefono", fono: "telefono",
  inasistencias: "inasistencias", faltas: "inasistencias",
  rendimiento: "rendimiento",
  "evaluaciones perdidas": "evaluacionesPerdidas", "evaluaciones no rendidas": "evaluacionesPerdidas", evaluacionesperdidas: "evaluacionesPerdidas",
  riesgo: "riesgoManual", "nivel de riesgo": "riesgoManual", "riesgo manual": "riesgoManual", riesgomanual: "riesgoManual",
  abandono: "abandono",
};

const RENDIMIENTOS = ["alto", "medio", "bajo"];
const RIESGOS = ["verde", "amarillo", "rojo"];
const esSi = (v: string) => ["si", "s", "true", "1", "x", "yes", "y"].includes(norm(v));

export async function importStudentsCSV(formData: FormData): Promise<ImportResult> {
  const vacio = { creados: 0, actualizados: 0, errores: [] as ImportResult["errores"] };

  const session = await getSession();
  if (!session) return { ok: false, message: "Sesión no válida. Vuelve a iniciar sesión.", ...vacio };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Selecciona un archivo CSV.", ...vacio };
  if (file.size > MAX_BYTES) return { ok: false, message: "El archivo supera los 2 MB.", ...vacio };

  const rows = parseCSV(await file.text());
  if (rows.length < 2) return { ok: false, message: "El archivo no tiene filas de datos.", ...vacio };
  if (rows.length - 1 > MAX_FILAS) return { ok: false, message: `Máximo ${MAX_FILAS} filas por archivo.`, ...vacio };

  // Mapear columnas
  const colIndex: Record<string, number> = {};
  rows[0].forEach((h, i) => {
    const campo = ALIASES[norm(h)];
    if (campo && !(campo in colIndex)) colIndex[campo] = i;
  });
  const faltan = ["nombre", "matricula", "carrera"].filter((c) => !(c in colIndex));
  if (faltan.length) {
    return { ok: false, message: `Faltan columnas obligatorias: ${faltan.join(", ")}.`, ...vacio };
  }
  const get = (r: string[], campo: string) => (campo in colIndex ? (r[colIndex[campo]] ?? "").trim() : "");

  const errores: ImportResult["errores"] = [];
  const porMatricula = new Map<string, any>(); // si se repite en el archivo gana la última fila

  rows.slice(1).forEach((r, i) => {
    const fila = i + 2; // contando el encabezado como fila 1
    const nombre = get(r, "nombre"), matricula = get(r, "matricula"), carrera = get(r, "carrera");
    if (!nombre || !matricula || !carrera) return errores.push({ fila, motivo: "Nombre, matrícula y carrera son obligatorios." });

    const rendRaw = norm(get(r, "rendimiento"));
    if (rendRaw && !RENDIMIENTOS.includes(rendRaw)) return errores.push({ fila, motivo: `Rendimiento "${get(r, "rendimiento")}" inválido (alto, medio o bajo).` });

    const riesgoRaw = norm(get(r, "riesgoManual"));
    if (riesgoRaw && !RIESGOS.includes(riesgoRaw)) return errores.push({ fila, motivo: `Riesgo "${get(r, "riesgoManual")}" inválido (verde, amarillo o rojo).` });

    const inas = get(r, "inasistencias"), evals = get(r, "evaluacionesPerdidas");
    if ((inas && !/^\d+$/.test(inas)) || (evals && !/^\d+$/.test(evals))) return errores.push({ fila, motivo: "Inasistencias y evaluaciones deben ser números enteros ≥ 0." });

    const email = get(r, "email");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return errores.push({ fila, motivo: `Email "${email}" inválido.` });

    porMatricula.set(matricula, {
      nombre, matricula, carrera,
      seccion: get(r, "seccion") || null,
      email: email || null,
      telefono: get(r, "telefono") || null,
      inasistencias: inas ? Number(inas) : 0,
      rendimiento: rendRaw || "medio",
      evaluacionesPerdidas: evals ? Number(evals) : 0,
      riesgoManual: riesgoRaw || null,
      abandono: esSi(get(r, "abandono")),
    });
  });

  const datos = [...porMatricula.values()];
  const existentes = new Set(
    (await prisma.student.findMany({ where: { matricula: { in: datos.map((d) => d.matricula) } }, select: { matricula: true } })).map((s) => s.matricula)
  );

  try {
    for (let i = 0; i < datos.length; i += 100) {
      await prisma.$transaction(
        datos.slice(i, i + 100).map((d) => prisma.student.upsert({ where: { matricula: d.matricula }, create: d, update: d }))
      );
    }
  } catch (e) {
    console.error("Error importando CSV", e);
    return { ok: false, message: "Error al guardar en la base de datos. No se completó la importación.", ...vacio, errores };
  }

  revalidatePath("/estudiantes");
  revalidatePath("/");
  revalidatePath("/alertas");

  const actualizados = datos.filter((d) => existentes.has(d.matricula)).length;
  return { ok: true, creados: datos.length - actualizados, actualizados, errores };
}

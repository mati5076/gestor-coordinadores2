"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Porcentaje de asistencia entre 0 y 100 (vacío o inválido = 100). Acepta "85,5". */
function parseAsistencia(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace("%", "").replace(",", ".").trim());
  if (!Number.isFinite(n) || String(v ?? "").trim() === "") return 100;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

// Server Actions: se llaman directamente desde el <form action={...}> en el
// cliente. Next.js se encarga del viaje red -> servidor, sin que tengas que
// escribir un endpoint /api a mano.

export async function createStudent(formData: FormData) {
  await prisma.student.create({
    data: {
      nombre: String(formData.get("nombre")),
      matricula: String(formData.get("matricula")),
      carrera: String(formData.get("carrera")),
      seccion: String(formData.get("seccion") || "") || null,
      email: String(formData.get("email") || "") || null,
      telefono: String(formData.get("telefono") || "") || null,
      asistencia: parseAsistencia(formData.get("asistencia")),
      rendimiento: String(formData.get("rendimiento") || "medio"),
      evaluacionesPerdidas: Number(formData.get("evaluacionesPerdidas") || 0),
      riesgoManual: (String(formData.get("riesgoManual") || "") || null) as any,
      abandono: formData.get("abandono") === "on",
    },
  });
  revalidatePath("/estudiantes");
  revalidatePath("/");
  revalidatePath("/alertas");
}

export async function updateStudent(id: string, formData: FormData) {
  await prisma.student.update({
    where: { id },
    data: {
      nombre: String(formData.get("nombre")),
      matricula: String(formData.get("matricula")),
      carrera: String(formData.get("carrera")),
      seccion: String(formData.get("seccion") || "") || null,
      email: String(formData.get("email") || "") || null,
      telefono: String(formData.get("telefono") || "") || null,
      asistencia: parseAsistencia(formData.get("asistencia")),
      rendimiento: String(formData.get("rendimiento") || "medio"),
      evaluacionesPerdidas: Number(formData.get("evaluacionesPerdidas") || 0),
      riesgoManual: (String(formData.get("riesgoManual") || "") || null) as any,
      abandono: formData.get("abandono") === "on",
    },
  });
  revalidatePath("/estudiantes");
  revalidatePath(`/estudiantes/${id}`);
  revalidatePath("/");
  revalidatePath("/alertas");
}

export async function deleteStudent(id: string) {
  await prisma.student.delete({ where: { id } });
  revalidatePath("/estudiantes");
  revalidatePath("/");
  revalidatePath("/alertas");
}

"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
      inasistencias: Number(formData.get("inasistencias") || 0),
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
      inasistencias: Number(formData.get("inasistencias") || 0),
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

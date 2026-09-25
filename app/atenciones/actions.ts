"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function parseDate(v: FormDataEntryValue | null) {
  return v ? new Date(String(v)) : null;
}

export async function createAtencion(formData: FormData) {
  const estado = String(formData.get("estado"));
  await prisma.atencion.create({
    data: {
      studentId: String(formData.get("studentId")),
      fecha: new Date(String(formData.get("fecha"))),
      responsable: String(formData.get("responsable")),
      tipo: String(formData.get("tipo")),
      tema: String(formData.get("tema")),
      duracionMin: Number(formData.get("duracionMin") || 0),
      observaciones: String(formData.get("observaciones") || "") || null,
      acuerdos: String(formData.get("acuerdos") || "") || null,
      estado,
      resueltoPrimerContacto: formData.get("resueltoPrimerContacto") === "on",
      fechaSeguimientoComprometido: parseDate(formData.get("fechaSeguimientoComprometido")),
      fechaCierre: estado === "cerrado" ? new Date() : null,
    },
  });
  revalidatePath("/atenciones");
  revalidatePath("/");
  revalidatePath("/estudiantes");
  revalidatePath("/alertas");
}

export async function updateAtencion(id: string, formData: FormData) {
  const estado = String(formData.get("estado"));
  const current = await prisma.atencion.findUnique({ where: { id } });
  await prisma.atencion.update({
    where: { id },
    data: {
      fecha: new Date(String(formData.get("fecha"))),
      responsable: String(formData.get("responsable")),
      tipo: String(formData.get("tipo")),
      tema: String(formData.get("tema")),
      duracionMin: Number(formData.get("duracionMin") || 0),
      observaciones: String(formData.get("observaciones") || "") || null,
      acuerdos: String(formData.get("acuerdos") || "") || null,
      estado,
      resueltoPrimerContacto: formData.get("resueltoPrimerContacto") === "on",
      fechaSeguimientoComprometido: parseDate(formData.get("fechaSeguimientoComprometido")),
      seguimientoCumplido: formData.get("seguimientoCumplido") === "on" ? true : current?.seguimientoCumplido ?? null,
      fechaCierre: estado === "cerrado" ? current?.fechaCierre ?? new Date() : null,
    },
  });
  revalidatePath("/atenciones");
  revalidatePath("/");
  revalidatePath("/estudiantes");
  revalidatePath("/alertas");
}

export async function deleteAtencion(id: string) {
  await prisma.atencion.delete({ where: { id } });
  revalidatePath("/atenciones");
  revalidatePath("/");
  revalidatePath("/alertas");
}

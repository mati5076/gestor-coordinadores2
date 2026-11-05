"use server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { isAllowedEmail, isAdminEmail } from "@/lib/auth";
import { issueResetToken, resetLink, sendResetEmail } from "@/lib/password-reset";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export type CrearState = { ok: boolean; message: string; link?: string } | undefined;

const INVITE_TTL_HOURS = 72;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Genera el enlace de "crea tu contraseña", lo envía por correo y, si el envío falla, lo devuelve para que el admin lo comparta. */
async function invite(user: { id: string; email: string; nombre: string }): Promise<{ sent: boolean; link: string; error?: string }> {
  const token = await issueResetToken(user.id, INVITE_TTL_HOURS * 60);
  const link = resetLink(token, true);
  const error = await sendResetEmail({ to: user.email, nombre: user.nombre, link, nuevo: true, horas: INVITE_TTL_HOURS });
  return { sent: !error, link, error: error ?? undefined };
}

export async function createCoordinatorAction(_prev: CrearState, formData: FormData): Promise<CrearState> {
  // La autorización se revalida aquí, en el servidor, no solo en el middleware.
  if (!(await getAdminSession())) return { ok: false, message: "No autorizado." };

  const nombre = String(formData.get("nombre") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!nombre || !email) return { ok: false, message: "Completa el nombre y el correo." };
  if (!EMAIL_RE.test(email) || !isAllowedEmail(email)) return { ok: false, message: "Solo se permiten correos institucionales @inacapmail.cl." };
  if (isAdminEmail(email)) return { ok: false, message: "Ese correo es el de la cuenta administradora." };
  if (await prisma.user.findUnique({ where: { email } })) return { ok: false, message: "Ya existe una cuenta con ese correo." };

  // La cuenta nace con una contraseña aleatoria que nadie conoce; el coordinador define la suya con el enlace.
  const user = await prisma.user.create({
    data: { nombre, email, password: await bcrypt.hash(randomBytes(24).toString("hex"), 10) },
  });
  const r = await invite(user);
  revalidatePath("/admin/usuarios");

  if (r.sent) return { ok: true, message: `Cuenta creada. Enviamos a ${email} un enlace para que cree su contraseña (válido ${INVITE_TTL_HOURS} h).` };
  return {
    ok: true,
    message: `Cuenta creada, pero no se pudo enviar el correo (${r.error}). Comparte este enlace con ${nombre} (válido ${INVITE_TTL_HOURS} h):`,
    link: r.link,
  };
}

/** Emite un enlace nuevo para un coordinador (invitación vencida, olvidó la contraseña, etc.). */
export async function resendInviteAction(userId: string): Promise<CrearState> {
  if (!(await getAdminSession())) return { ok: false, message: "No autorizado." };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || isAdminEmail(user.email)) return { ok: false, message: "Usuario no encontrado." };

  const r = await invite(user);
  if (r.sent) return { ok: true, message: `Enlace enviado a ${user.email}.` };
  return { ok: true, message: `No se pudo enviar el correo (${r.error}). Comparte este enlace con ${user.nombre}:`, link: r.link };
}

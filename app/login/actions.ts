"use server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, isAllowedEmail, SESSION_COOKIE, SESSION_COOKIE_MAX_AGE, MAX_FAILED_ATTEMPTS } from "@/lib/auth";
import { issueResetToken, resetLink, sendResetEmail } from "@/lib/password-reset";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export type AuthState = { error?: string; info?: string; canReset?: boolean; email?: string } | undefined;

const RESET_TTL_MIN = 60;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Ingresa tu correo y tu contraseña." };
  if (!isAllowedEmail(email)) return { error: "Solo se permiten correos institucionales @inacapmail.cl." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "No existe una cuenta con ese correo." };

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    // El conteo vive en la base de datos (no en el navegador) para que no se pueda saltar.
    const updated = await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: { increment: 1 } } });
    if (updated.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      return {
        error: `Contraseña incorrecta. Ya fallaste ${MAX_FAILED_ATTEMPTS} veces: puedes cambiarla.`,
        canReset: true,
        email,
      };
    }
    const left = MAX_FAILED_ATTEMPTS - updated.failedAttempts;
    return { error: `Contraseña incorrecta. Te ${left === 1 ? "queda 1 intento" : `quedan ${left} intentos`} antes de poder cambiarla.` };
  }

  // Entrada correcta: se limpian los intentos y se reinicia el aviso de riesgo para que
  // el correo con los alumnos en riesgo salga en cuanto se abra el panel (ver RiskAlertToasts).
  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lastRiskEmailAt: null } });

  const token = await createSessionToken(user);
  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  redirect("/");
}

/**
 * Pide el cambio de contraseña. Solo se acepta si la cuenta ya acumuló 3 intentos
 * fallidos. El enlace se envía al correo de la cuenta (así nadie puede cambiar la
 * contraseña de otra persona solo conociendo su correo) y la página de destino
 * pide únicamente la contraseña nueva, dos veces.
 */
export async function requestPasswordResetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const generic: AuthState = { canReset: true, email, info: `Si la cuenta ${email} existe, te enviamos un enlace para cambiar la contraseña. Revisa tu correo (y la carpeta de spam).` };

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || user.failedAttempts < MAX_FAILED_ATTEMPTS) return generic;

  // Evita disparar un correo por cada clic: si el último enlace se emitió hace menos de 1 minuto, no se emite otro.
  const emitidoHace = user.resetTokenExp ? Date.now() - (user.resetTokenExp.getTime() - RESET_TTL_MIN * 60_000) : Infinity;
  if (emitidoHace < 60_000) return generic;

  const token = await issueResetToken(user.id, RESET_TTL_MIN);
  const err = await sendResetEmail({ to: user.email, nombre: user.nombre, link: resetLink(token), nuevo: false, horas: RESET_TTL_MIN / 60 });
  if (err) return { canReset: true, email, error: `No se pudo enviar el correo: ${err}. Avisa al administrador (admin@inacapmail.cl).` };
  return generic;
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}

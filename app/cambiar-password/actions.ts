"use server";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { findUserByResetToken } from "@/lib/password-reset";
import bcrypt from "bcryptjs";

export type ResetState = { ok?: boolean; error?: string } | undefined;

export async function resetPasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const password2 = String(formData.get("password2") || "");

  if (password.length < MIN_PASSWORD_LENGTH) return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  if (password !== password2) return { error: "Las contraseñas no coinciden. Escríbelas de nuevo." };

  const user = await findUserByResetToken(token);
  if (!user) return { error: "El enlace no es válido o ya expiró. Pide uno nuevo desde la pantalla de inicio de sesión." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 10),
      failedAttempts: 0,
      resetTokenHash: null, // el enlace se puede usar una sola vez
      resetTokenExp: null,
    },
  });
  return { ok: true };
}

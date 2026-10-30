"use server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, isAllowedEmail, SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export type AuthState = { error?: string } | undefined;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Ingresa tu correo y tu contraseña." };
  if (!isAllowedEmail(email)) return { error: "Solo se permiten correos institucionales @inacapmail.cl." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "No existe una cuenta con ese correo." };

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return { error: "Contraseña incorrecta." };

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

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}

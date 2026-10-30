"use server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, isAllowedEmail, SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { AuthState } from "@/app/login/actions";

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const nombre = String(formData.get("nombre") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const password2 = String(formData.get("password2") || "");

  if (!nombre || !email || !password) return { error: "Completa todos los campos." };
  if (!isAllowedEmail(email)) return { error: "Solo se permiten correos institucionales @inacapmail.cl." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (password !== password2) return { error: "Las contraseñas no coinciden." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe una cuenta con ese correo. Inicia sesión." };

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { nombre, email, password: hash } });

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

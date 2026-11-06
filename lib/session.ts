import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SessionPayload, verifySessionToken, isAdminEmail } from "@/lib/auth";

/** Lee y valida la sesión actual desde la cookie. Úsalo en Server Components y Server Actions. */
export async function getSession(): Promise<SessionPayload | null> {
  const payload = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  // El middleware (runtime Edge) no puede consultar la base de datos, así que aquí se revalida
  // que la cuenta siga existiendo y habilitada: si el administrador la deshabilita, la sesión deja de valer.
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { habilitado: true } });
  if (!user || !user.habilitado) return null;
  return payload;
}

/** true si la cookie de sesión es válida (firma y vigencia) pero la cuenta ya no está habilitada / no existe. */
export async function hasRevokedSession(): Promise<boolean> {
  const payload = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  return !!payload && !(await getSession());
}

/** Sesión válida de la cuenta administradora (admin@inacapmail.cl), o `null`. Úsalo en las acciones de /admin. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session && isAdminEmail(session.email) ? session : null;
}

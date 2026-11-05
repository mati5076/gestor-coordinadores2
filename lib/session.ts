import { cookies } from "next/headers";
import { SESSION_COOKIE, SessionPayload, verifySessionToken, isAdminEmail } from "@/lib/auth";

/** Lee y valida la sesión actual desde la cookie. Úsalo en Server Components y Server Actions. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** Sesión válida de la cuenta administradora (admin@inacapmail.cl), o `null`. Úsalo en las acciones de /admin. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session && isAdminEmail(session.email) ? session : null;
}

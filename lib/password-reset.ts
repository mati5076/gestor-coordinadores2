import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isSmtpConfigured, sendMail } from "@/lib/mailer";

// Enlaces de cambio / creación de contraseña. Solo se guarda el hash (SHA-256)
// del token en la base de datos; el token en claro viaja únicamente en el
// enlace que se envía al correo del usuario.

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Genera y guarda un token nuevo para el usuario (invalida el anterior). Devuelve el token en claro. */
export async function issueResetToken(userId: string, ttlMinutes: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: { resetTokenHash: hashToken(token), resetTokenExp: new Date(Date.now() + ttlMinutes * 60_000) },
  });
  return token;
}

/** Busca al usuario dueño de un token vigente (o null si no existe / expiró). */
export async function findUserByResetToken(token: string | undefined | null) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return prisma.user.findFirst({
    where: { resetTokenHash: hashToken(token), resetTokenExp: { gt: new Date() }, habilitado: true },
  });
}

/** URL base de la app: APP_URL si está definida, si no se deduce de la petición. */
export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const resetLink = (token: string, nuevo = false) =>
  `${getAppUrl()}/cambiar-password?token=${token}${nuevo ? "&nuevo=1" : ""}`;

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Envía el correo con el enlace. Devuelve el error (texto) si no se pudo enviar, o null si salió bien. */
export async function sendResetEmail(opts: { to: string; nombre: string; link: string; nuevo: boolean; horas: number }): Promise<string | null> {
  if (!isSmtpConfigured()) return "SMTP no configurado en el servidor (.env).";
  const titulo = opts.nuevo ? "Crea tu contraseña" : "Cambia tu contraseña";
  const intro = opts.nuevo
    ? "El administrador creó tu cuenta de coordinador en Seguimiento — Atención estudiantil. Para entrar, crea tu contraseña con este enlace:"
    : "Recibimos una solicitud para cambiar tu contraseña de Seguimiento — Atención estudiantil. Usa este enlace:";
  const nota = `El enlace es válido por ${opts.horas} horas y solo se puede usar una vez. Si no lo solicitaste, ignora este correo.`;
  try {
    await sendMail({
      to: opts.to,
      subject: `${titulo} — Seguimiento estudiantil`,
      text: `Hola ${opts.nombre},\n\n${intro}\n${opts.link}\n\n${nota}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;color:#2b2b2b">
  <div style="background:#E30613;color:#fff;padding:14px 18px;font-weight:700;font-size:16px">${titulo}</div>
  <div style="padding:16px 18px;border:1px solid #e6e6e6;border-top:none">
    <p>Hola ${esc(opts.nombre)},</p><p>${intro}</p>
    <p style="margin:20px 0"><a href="${opts.link}" style="background:#E30613;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">${titulo}</a></p>
    <p style="color:#6b6b6b;font-size:12px">${nota}</p>
  </div></div>`,
    });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

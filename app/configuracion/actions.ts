"use server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { sendRiskAlertEmail } from "@/lib/alert-email";
import { isSmtpConfigured, sendMail } from "@/lib/mailer";

export type ActionState = { ok: boolean; message: string } | undefined;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireSession() {
  if (!(await getSession())) throw new Error("No autorizado");
}

export async function saveAlertSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const emailEnabled = formData.get("emailEnabled") === "on";
  const coordinatorEmail = String(formData.get("coordinatorEmail") || "").trim();
  if (emailEnabled && !EMAIL_RE.test(coordinatorEmail)) {
    return { ok: false, message: "Ingresa un correo válido para el coordinador." };
  }
  await prisma.alertSettings.upsert({
    where: { id: "global" },
    create: { id: "global", emailEnabled, coordinatorEmail: coordinatorEmail || null },
    update: { emailEnabled, coordinatorEmail: coordinatorEmail || null },
  });
  revalidatePath("/configuracion");
  return { ok: true, message: "Configuración guardada." };
}

export async function sendTestEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const to = String(formData.get("coordinatorEmail") || "").trim();
  if (!EMAIL_RE.test(to)) return { ok: false, message: "Ingresa un correo válido antes de probar." };
  if (!isSmtpConfigured()) return { ok: false, message: "SMTP no configurado en el servidor (.env)." };
  try {
    await sendMail({
      to,
      subject: "Prueba — Alertas de Seguimiento estudiantil",
      text: "Este es un correo de prueba. Las alertas de riesgo llegarán a esta dirección.",
      html: "<p>Este es un correo de prueba. Las alertas de riesgo llegarán a esta dirección.</p>",
    });
    return { ok: true, message: `Correo de prueba enviado a ${to}.` };
  } catch (e) {
    return { ok: false, message: `No se pudo enviar: ${(e as Error).message}` };
  }
}

/** Envía todas las alertas vigentes ahora mismo, aunque ya se hayan avisado antes. */
export async function resendAllAlerts(): Promise<ActionState> {
  await requireSession();
  const r = await sendRiskAlertEmail({ force: true });
  return { ok: r.ok, message: r.message };
}

/** Llamada automáticamente al abrir la app: avisa solo de alertas nuevas. */
export async function notifyCoordinatorOfNewAlerts(): Promise<void> {
  if (!(await getSession())) return;
  await sendRiskAlertEmail();
}

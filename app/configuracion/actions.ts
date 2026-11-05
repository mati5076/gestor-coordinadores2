"use server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { sendRiskAlertEmail, sendRiskSummaryToUser, getAlertSettings } from "@/lib/alert-email";
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

/**
 * Se llama automáticamente al abrir la app (ver RiskAlertToasts):
 *  1. Envía a quien acaba de entrar el resumen de TODOS los estudiantes en riesgo.
 *  2. Si en Configuración hay un correo de coordinador distinto, le avisa de las alertas nuevas.
 * Los errores de correo nunca deben romper la navegación, por eso se capturan.
 */
export async function notifyCoordinatorOfNewAlerts(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const settings = await getAlertSettings();
  const coordinatorEmail = settings?.emailEnabled ? settings.coordinatorEmail?.toLowerCase() : null;
  const esElMismo = coordinatorEmail === session.email.toLowerCase();

  try {
    await sendRiskSummaryToUser({ id: session.sub, email: session.email });
  } catch (e) {
    console.error("[alertas] no se pudo enviar el resumen al usuario:", e);
  }
  if (!esElMismo) {
    try {
      await sendRiskAlertEmail();
    } catch (e) {
      console.error("[alertas] no se pudo avisar al correo del coordinador:", e);
    }
  }
}

import { prisma } from "@/lib/prisma";
import { getHighRiskStudents, RiskyStudent } from "@/lib/risk-alerts";
import { isSmtpConfigured, sendMail } from "@/lib/mailer";

export type SendResult = { ok: boolean; sent: number; message: string };

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function getAlertSettings() {
  return prisma.alertSettings.findUnique({ where: { id: "global" } });
}

function buildEmail(students: RiskyStudent[]) {
  const nivel = (n: string) => (n === "rojo" ? "Riesgo ALTO" : "Riesgo medio");
  const subject = `Alerta: ${students.length} estudiante(s) con riesgo requieren seguimiento`;
  const text =
    "Alerta — Alumnos con riesgo, favor de hacer seguimiento:\n\n" +
    students.map((s) => `• ${s.nombre} (${s.matricula}, ${s.carrera}) — ${nivel(s.nivel)}`).join("\n");
  const rows = students
    .map(
      (s) =>
        `<tr><td style="padding:8px 10px;border-bottom:1px solid #e6e6e6"><b>${esc(s.nombre)}</b><br><span style="color:#6b6b6b;font-size:12px">${esc(s.matricula)} · ${esc(s.carrera)}</span></td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #e6e6e6;color:${s.nivel === "rojo" ? "#E30613" : "#8A6100"};font-weight:600">${nivel(s.nivel)}</td></tr>`
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#2b2b2b">
  <div style="background:#E30613;color:#fff;padding:14px 18px;font-weight:700;font-size:16px">Alerta — Seguimiento estudiantil</div>
  <div style="padding:16px 18px;border:1px solid #e6e6e6;border-top:none">
    <p style="margin:0 0 12px">Alumnos con riesgo, favor de hacer seguimiento:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
  </div></div>`;
  return { subject, text, html };
}

/**
 * Envía al coordinador un resumen con los estudiantes en riesgo que aún no se le
 * han avisado (o cuyo nivel subió). Si `force` es true reenvía a todos los que
 * están en riesgo, ignorando el registro de envíos previos.
 */
export async function sendRiskAlertEmail(opts: { force?: boolean } = {}): Promise<SendResult> {
  const settings = await getAlertSettings();
  if (!settings?.emailEnabled) return { ok: true, sent: 0, message: "El envío por correo está desactivado." };
  if (!settings.coordinatorEmail) return { ok: false, sent: 0, message: "Falta el correo del coordinador." };
  if (!isSmtpConfigured()) return { ok: false, sent: 0, message: "SMTP no configurado en el servidor (.env)." };

  const risky = await getHighRiskStudents();
  const log = await prisma.alertEmailLog.findMany();
  const logMap = new Map(log.map((l) => [l.studentId, l.nivel]));

  // Quien ya no está en riesgo se olvida, para volver a avisar si reincide.
  const riskyIds = new Set(risky.map((s) => s.id));
  const stale = log.filter((l) => !riskyIds.has(l.studentId)).map((l) => l.studentId);
  if (stale.length) await prisma.alertEmailLog.deleteMany({ where: { studentId: { in: stale } } });

  const pending = opts.force
    ? risky
    : risky.filter((s) => {
        const prev = logMap.get(s.id);
        return !prev || (prev === "amarillo" && s.nivel === "rojo");
      });
  if (pending.length === 0) return { ok: true, sent: 0, message: "No hay alertas nuevas que enviar." };

  pending.sort((a, b) => (a.nivel === b.nivel ? a.nombre.localeCompare(b.nombre) : a.nivel === "rojo" ? -1 : 1));
  try {
    await sendMail({ to: settings.coordinatorEmail, ...buildEmail(pending) });
  } catch (e) {
    return { ok: false, sent: 0, message: `No se pudo enviar el correo: ${(e as Error).message}` };
  }
  await Promise.all(
    pending.map((s) =>
      prisma.alertEmailLog.upsert({
        where: { studentId: s.id },
        create: { studentId: s.id, nivel: s.nivel },
        update: { nivel: s.nivel, sentAt: new Date() },
      })
    )
  );
  return { ok: true, sent: pending.length, message: `Correo enviado a ${settings.coordinatorEmail} (${pending.length} alerta(s)).` };
}

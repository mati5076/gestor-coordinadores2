import nodemailer from "nodemailer";

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Envía un correo usando el SMTP definido en .env. Lanza error si falta configuración. */
export async function sendMail(opts: { to: string; subject: string; text: string; html: string }) {
  if (!isSmtpConfigured()) throw new Error("SMTP no configurado (revisa SMTP_HOST, SMTP_USER y SMTP_PASS en .env).");
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, ...opts });
}

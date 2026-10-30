import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/session";
import { getHighRiskStudents } from "@/lib/risk-alerts";

export const metadata: Metadata = {
  title: "Seguimiento — Gestión de Atención Estudiantil",
  description: "Registro, alertas y KPIs de atención estudiantil",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session ? { nombre: session.nombre, email: session.email } : null;
  // Solo consultamos la base de datos si hay sesión (en /login y /registro no aplica).
  const riskyStudents = session ? await getHighRiskStudents() : [];

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppShell user={user} riskyStudents={riskyStudents}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}

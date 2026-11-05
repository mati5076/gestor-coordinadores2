"use client";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import RiskAlertToasts from "@/components/RiskAlertToasts";
import type { RiskyStudent } from "@/lib/risk-alerts";

export type SessionUser = { nombre: string; email: string; isAdmin?: boolean };

const AUTH_ROUTES = ["/login", "/cambiar-password"];

export default function AppShell({
  children,
  user,
  riskyStudents,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
  riskyStudents: RiskyStudent[];
}) {
  const pathname = usePathname();

  if (AUTH_ROUTES.includes(pathname)) {
    // Las pantallas de login y cambio de contraseña no llevan sidebar ni barra superior.
    return <>{children}</>;
  }

  return (
    <div id="shell">
      <Sidebar user={user} />
      <div className="main">{children}</div>
      <RiskAlertToasts students={riskyStudents} />
    </div>
  );
}

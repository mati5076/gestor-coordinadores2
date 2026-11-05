"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import LogoutButton from "@/components/LogoutButton";
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
  const [navOpen, setNavOpen] = useState(false);

  // En el celular el menú es un panel lateral: se cierra al cambiar de página.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (AUTH_ROUTES.includes(pathname)) {
    // Las pantallas de login y cambio de contraseña no llevan sidebar ni barra superior.
    return <>{children}</>;
  }

  return (
    <div id="shell" className={navOpen ? "nav-open" : ""}>
      {/* Barra superior: solo visible en pantallas chicas */}
      <header className="mobile-bar">
        <button type="button" className="icon-btn" aria-label="Abrir menú" aria-expanded={navOpen} onClick={() => setNavOpen((o) => !o)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="brand-mark">SE</div>
        <b>Seguimiento</b>
        <span style={{ flex: 1 }} />
        {user && <LogoutButton className="icon-btn" />}
      </header>

      <Sidebar user={user} onNavigate={() => setNavOpen(false)} />
      <div className="scrim" onClick={() => setNavOpen(false)} />
      <div className="main">{children}</div>
      <RiskAlertToasts students={riskyStudents} />
    </div>
  );
}

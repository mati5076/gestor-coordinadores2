"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { initials } from "@/components/ui";
import type { SessionUser } from "@/components/AppShell";

const NAV_ITEMS = [
  { href: "/", ic: "◧", label: "Panel general" },
  { href: "/estudiantes", ic: "◍", label: "Estudiantes" },
  { href: "/atenciones", ic: "✎", label: "Atenciones" },
  { href: "/alertas", ic: "⚑", label: "Alertas" },
  { href: "/configuracion", ic: "⚙", label: "Configuración" },
  // Derivaciones y Reportes siguen exactamente el mismo patrón que
  // /atenciones: una page.tsx server component + actions.ts con "use server".
  // Duplica esas dos carpetas para completarlos (ver README).
];

// Solo se muestra a la cuenta administradora.
const ADMIN_ITEMS = [{ href: "/admin/usuarios", ic: "☰", label: "Administración" }];

export default function Sidebar({ user, onNavigate }: { user: SessionUser | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = user?.isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;
  return (
    <div className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
      <div className="brand">
        <div className="brand-mark">SE</div>
        <div className="brand-text">
          <b>Seguimiento</b>
          <span>Atención estudiantil</span>
        </div>
      </div>
      <nav className="nav" style={{ flex: 1 }}>
        {items.map((n) => (
          <Link key={n.href} href={n.href} onClick={onNavigate} className={`nav-item ${pathname === n.href ? "active" : ""}`}>
            <span style={{ width: 18, textAlign: "center" }}>{n.ic}</span>
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
      {user && (
        <div className="user-badge">
          <div className="avatar">{initials(user.nombre)}</div>
          <div className="user-badge-text">
            <b>{user.nombre}</b>
            <span>{user.email}</span>
          </div>
          <LogoutButton className="logout-btn" />
        </div>
      )}
    </div>
  );
}

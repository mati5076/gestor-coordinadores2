"use client";
import { logoutAction } from "@/app/login/actions";

// Icono de "cerrar sesión" (puerta con flecha). Se usa en la barra lateral y en la barra superior del celular.
export default function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction} style={{ display: "contents" }}>
      <button type="submit" className={className} title="Cerrar sesión" aria-label="Cerrar sesión">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      </button>
    </form>
  );
}

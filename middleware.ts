import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, isAdminEmail } from "@/lib/auth";

// Rutas accesibles sin haber iniciado sesión. Ya no hay registro público: las cuentas
// de coordinadores las crea el administrador en /admin/usuarios.
const PUBLIC_PATHS = ["/login", "/cambiar-password"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // El cron externo no tiene cookie de sesión: se protege con CRON_SECRET en la propia ruta.
  if (pathname.startsWith("/api/cron/")) return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic) {
    // Si ya inició sesión, no tiene sentido volver a mostrarle el login
    // (el enlace de cambio de contraseña sí debe funcionar aunque haya sesión abierta).
    if (session && pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // /admin/* es solo para la cuenta administradora (las acciones además lo revalidan en el servidor).
  if (pathname.startsWith("/admin") && !isAdminEmail(session.email)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Corre en todas las rutas excepto assets estáticos internos de Next.js.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

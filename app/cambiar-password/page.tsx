import Link from "next/link";
import { findUserByResetToken } from "@/lib/password-reset";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function CambiarPasswordPage({ searchParams }: { searchParams: { token?: string; nuevo?: string } }) {
  const user = await findUserByResetToken(searchParams.token);
  const nuevo = searchParams.nuevo === "1";

  return (
    <div className="auth-screen">
      <div className="card card-pad auth-card">
        <div className="brand" style={{ padding: 0, marginBottom: 18 }}>
          <div className="brand-mark">SE</div>
          <div className="brand-text">
            <b>Seguimiento</b>
            <span>Atención estudiantil</span>
          </div>
        </div>
        {user ? (
          <>
            <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>{nuevo ? "Crea tu contraseña" : "Cambiar contraseña"}</h1>
            <p className="muted" style={{ fontSize: 13, margin: "0 0 18px" }}>
              Cuenta: <b>{user.email}</b>. Escríbela dos veces para confirmar que quedó bien.
            </p>
            <ResetPasswordForm token={searchParams.token as string} />
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>Enlace no válido</h1>
            <p className="muted" style={{ fontSize: 13, margin: "0 0 18px" }}>
              Este enlace no existe, ya se usó o expiró. Vuelve a iniciar sesión y, si fallas 3 veces, podrás pedir uno nuevo.
            </p>
            <Link href="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Ir a iniciar sesión</Link>
          </>
        )}
      </div>
    </div>
  );
}

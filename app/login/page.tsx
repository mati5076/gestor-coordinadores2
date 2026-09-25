"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={pending}>
      {pending ? "Ingresando…" : "Iniciar sesión"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, undefined);

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
        <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>Iniciar sesión</h1>
        <p className="muted" style={{ fontSize: 13, margin: "0 0 18px" }}>
          Usa tu correo institucional (@inacapmail.cl).
        </p>
        <form action={formAction}>
          <div className="field">
            <label>Correo institucional</label>
            <input required type="email" name="email" placeholder="nombre.apellido@inacapmail.cl" autoComplete="username" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input required type="password" name="password" autoComplete="current-password" />
          </div>
          {state?.error && <div className="auth-error">{state.error}</div>}
          <SubmitButton />
        </form>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16, textAlign: "center" }}>
          ¿No tienes cuenta? <Link href="/registro">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}

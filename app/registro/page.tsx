"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={pending}>
      {pending ? "Creando cuenta…" : "Crear cuenta"}
    </button>
  );
}

export default function RegistroPage() {
  const [state, formAction] = useFormState(registerAction, undefined);

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
        <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>Crear cuenta</h1>
        <p className="muted" style={{ fontSize: 13, margin: "0 0 18px" }}>
          Solo para correos institucionales (@inacapmail.cl).
        </p>
        <form action={formAction}>
          <div className="field">
            <label>Nombre completo</label>
            <input required name="nombre" autoComplete="name" />
          </div>
          <div className="field">
            <label>Correo institucional</label>
            <input required type="email" name="email" placeholder="nombre.apellido@inacapmail.cl" autoComplete="username" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Contraseña</label>
              <input required type="password" name="password" minLength={6} autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Repite la contraseña</label>
              <input required type="password" name="password2" minLength={6} autoComplete="new-password" />
            </div>
          </div>
          {state?.error && <div className="auth-error">{state.error}</div>}
          <SubmitButton />
        </form>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16, textAlign: "center" }}>
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

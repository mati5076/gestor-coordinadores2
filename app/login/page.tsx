"use client";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, requestPasswordResetAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={pending}>
      {pending ? "Ingresando…" : "Iniciar sesión"}
    </button>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" style={{ width: "100%", justifyContent: "center" }} disabled={pending}>
      {pending ? "Enviando enlace…" : "Cambiar contraseña"}
    </button>
  );
}

export default function LoginPage({ searchParams }: { searchParams?: { deshabilitada?: string } }) {
  const [state, formAction] = useFormState(loginAction, undefined);
  const [resetState, resetAction] = useFormState(requestPasswordResetAction, undefined);

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
          {searchParams?.deshabilitada && !state?.error && (
            <div className="auth-error">Tu cuenta fue deshabilitada por el administrador. Contacta a admin@inacapmail.cl.</div>
          )}
          {state?.error && <div className="auth-error">{state.error}</div>}
          <SubmitButton />
        </form>
        {/* Tras 3 contraseñas incorrectas (contadas en el servidor) se ofrece el cambio de contraseña. */}
        {state?.canReset && (
          <form action={resetAction} style={{ marginTop: 14 }}>
            <input type="hidden" name="email" value={state.email ?? ""} />
            {resetState?.info ? (
              <div className="notice notice-ok" style={{ marginBottom: 0 }}>{resetState.info}</div>
            ) : (
              <>
                {resetState?.error && <div className="auth-error">{resetState.error}</div>}
                <ResetButton />
              </>
            )}
          </form>
        )}
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16, textAlign: "center" }}>
          ¿Eres coordinador nuevo? Pide tu cuenta al administrador (admin@inacapmail.cl).
        </p>
      </div>
    </div>
  );
}

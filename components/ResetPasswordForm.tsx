"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { resetPasswordAction } from "@/app/cambiar-password/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={pending}>
      {pending ? "Guardando…" : "Guardar contraseña"}
    </button>
  );
}

// Solo dos campos: la contraseña nueva y su repetición.
export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useFormState(resetPasswordAction, undefined);

  if (state?.ok) {
    return (
      <>
        <div className="notice notice-ok">Listo: tu contraseña quedó actualizada.</div>
        <Link href="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Iniciar sesión</Link>
      </>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label>Contraseña nueva</label>
        <input required type="password" name="password" minLength={6} autoComplete="new-password" autoFocus />
      </div>
      <div className="field">
        <label>Repite la contraseña</label>
        <input required type="password" name="password2" minLength={6} autoComplete="new-password" />
      </div>
      {state?.error && <div className="auth-error">{state.error}</div>}
      <SubmitButton />
    </form>
  );
}

"use client";
import { useFormState, useFormStatus } from "react-dom";
import { useState, useTransition } from "react";
import { saveAlertSettings, sendTestEmail, resendAllAlerts, type ActionState } from "@/app/configuracion/actions";

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  return <div className={`notice ${state.ok ? "notice-ok" : "notice-err"}`}>{state.message}</div>;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>;
}

function TestButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn" disabled={pending}>{pending ? "Enviando…" : "Enviar correo de prueba"}</button>;
}

export default function AlertSettingsForm({
  initialEnabled,
  initialEmail,
  smtpOk,
}: {
  initialEnabled: boolean;
  initialEmail: string;
  smtpOk: boolean;
}) {
  const [saveState, saveAction] = useFormState(saveAlertSettings, undefined);
  const [testState, testAction] = useFormState(sendTestEmail, undefined);
  const [resendState, setResendState] = useState<ActionState>();
  const [email, setEmail] = useState(initialEmail);
  const [pending, start] = useTransition();

  return (
    <div className="card card-pad settings-card">
      <h2 className="section-title">Alertas por correo al coordinador</h2>
      <p className="section-sub">
        Además de la notificación emergente en pantalla, envía un correo al coordinador cuando un estudiante entra en riesgo.
      </p>

      {!smtpOk && (
        <div className="notice notice-warn">
          El servidor aún no tiene SMTP configurado. Completa <code>SMTP_HOST</code>, <code>SMTP_USER</code> y{" "}
          <code>SMTP_PASS</code> en <code>.env</code> para poder enviar correos.
        </div>
      )}

      <form action={saveAction}>
        <label className="switch-row">
          <input type="checkbox" name="emailEnabled" defaultChecked={initialEnabled} />
          <div>
            <b>Enviar también las alertas al correo del coordinador</b>
            <span>Se envía un resumen con las alertas nuevas (no se repite el aviso del mismo estudiante).</span>
          </div>
        </label>
        <div className="field">
          <label>Correo del coordinador</label>
          <input type="email" name="coordinatorEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coordinador@inacapmail.cl" />
        </div>
        <Notice state={saveState} />
        <div className="form-actions" style={{ justifyContent: "flex-start" }}>
          <SaveButton />
        </div>
      </form>

      <form action={testAction} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
        <input type="hidden" name="coordinatorEmail" value={email} />
        <Notice state={testState} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <TestButton />
          <button
            type="button"
            className="btn"
            disabled={pending}
            onClick={() => start(async () => setResendState(await resendAllAlerts()))}
          >
            {pending ? "Enviando…" : "Reenviar todas las alertas vigentes"}
          </button>
        </div>
        <Notice state={resendState} />
      </form>
    </div>
  );
}

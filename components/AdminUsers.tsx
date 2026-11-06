"use client";
import { useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCoordinatorAction, resendInviteAction, setUserEnabledAction, type CrearState } from "@/app/admin/usuarios/actions";

export type UserRow = { id: string; nombre: string; email: string; createdAt: string; isAdmin: boolean; habilitado: boolean };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Creando…" : "Crear cuenta"}</button>;
}

function Notice({ state }: { state: CrearState }) {
  if (!state) return null;
  return (
    <div className={`notice ${state.ok ? "notice-ok" : "notice-err"}`}>
      {state.message}
      {state.link && (
        <input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} style={{ marginTop: 8, width: "100%", fontSize: 12 }} />
      )}
    </div>
  );
}

export default function AdminUsers({ users }: { users: UserRow[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(async (prev: CrearState, fd: FormData) => {
    const r = await createCoordinatorAction(prev, fd);
    if (r?.ok) formRef.current?.reset();
    return r;
  }, undefined);
  const [rowState, setRowState] = useState<{ id: string; state: CrearState }>();
  const [pending, start] = useTransition();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card card-pad settings-card">
        <h2 className="section-title">Nuevo coordinador</h2>
        <p className="section-sub">
          Se crea la cuenta y se le envía un correo con un enlace para que defina su propia contraseña. Solo correos <b>@inacapmail.cl</b>.
        </p>
        <form ref={formRef} action={action}>
          <div className="field-row">
            <div className="field">
              <label>Nombre completo</label>
              <input required name="nombre" autoComplete="off" />
            </div>
            <div className="field">
              <label>Correo institucional</label>
              <input required type="email" name="email" placeholder="nombre.apellido@inacapmail.cl" autoComplete="off" />
            </div>
          </div>
          <Notice state={state} />
          <div className="form-actions" style={{ justifyContent: "flex-start" }}>
            <SubmitButton />
          </div>
        </form>
      </div>

      <div className="card card-pad">
        <h2 className="section-title">Cuentas ({users.length})</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Estado</th><th>Creada</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={u.habilitado ? undefined : { opacity: 0.75 }}>
                  <td><b>{u.nombre}</b>{u.isAdmin && <span className="muted"> · administrador</span>}</td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <span className="badge" style={u.habilitado ? { background: "var(--verde-tint)", color: "#1E7A32" } : { background: "#FDECEC", color: "#B3261E" }}>
                      {u.habilitado ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </td>
                  <td className="muted">{u.createdAt}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {!u.isAdmin && (
                      <>
                        {u.habilitado && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={pending}
                            onClick={() => start(async () => setRowState({ id: u.id, state: await resendInviteAction(u.id) }))}
                          >
                            Enviar enlace de contraseña
                          </button>
                        )}{" "}
                        <button
                          type="button"
                          className={`btn btn-sm ${u.habilitado ? "btn-danger" : "btn-primary"}`}
                          disabled={pending}
                          onClick={() => {
                            if (u.habilitado && !confirm(`¿Deshabilitar ${u.email}? No podrá iniciar sesión ni recibir correos hasta que lo vuelvas a habilitar.`)) return;
                            start(async () => setRowState({ id: u.id, state: await setUserEnabledAction(u.id, !u.habilitado) }));
                          }}
                        >
                          {u.habilitado ? "Deshabilitar" : "Habilitar"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rowState && <div style={{ marginTop: 12 }}><Notice state={rowState.state} /></div>}
      </div>
    </div>
  );
}

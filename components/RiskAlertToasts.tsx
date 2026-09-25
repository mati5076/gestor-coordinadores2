"use client";
import { useEffect, useState } from "react";
import type { RiskyStudent } from "@/lib/risk-alerts";

// Recordamos qué alertas ya cerró el usuario (por pestaña/sesión del
// navegador) para que no vuelvan a aparecer al navegar entre páginas.
const STORAGE_KEY = "risk-alerts-dismissed";

function readDismissed(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export default function RiskAlertToasts({ students }: { students: RiskyStudent[] }) {
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  function handleDismiss(id: string) {
    setDismissed((prev) => {
      const next = [...(prev ?? []), id];
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  if (dismissed === null || students.length === 0) return null;
  const visible = students.filter((s) => !dismissed.includes(s.id));
  if (visible.length === 0) return null;

  return (
    <div className="risk-toast-stack">
      {visible.map((s) => (
        <div key={s.id} className="risk-toast" role="alert">
          <span className="risk-toast-icon">⚠</span>
          <div className="risk-toast-body">
            <b>Alerta</b>
            <p>
              Alumno con riesgo, favor de poder hacer seguimiento al alumno (<b>{s.nombre}</b>).
            </p>
          </div>
          <button type="button" className="risk-toast-close" aria-label="Cerrar alerta" onClick={() => handleDismiss(s.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

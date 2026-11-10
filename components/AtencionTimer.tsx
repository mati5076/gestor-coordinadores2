"use client";
import { useEffect, useRef, useState } from "react";

export type TimerStatus = "idle" | "running" | "paused" | "stopped";
type Stored = { status: TimerStatus; accMs: number; startedAt: number | null };

const KEY = "atencion-timer-v1";
const EMPTY: Stored = { status: "idle", accMs: 0, startedAt: null };

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch { return EMPTY; }
}
function save(s: Stored) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin storage */ }
}
export function clearAtencionTimer() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function fmtClock(ms: number) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
/** Minutos redondeados al más cercano, mínimo 1 si hubo tiempo. */
export function msToMinutes(ms: number) {
  return ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60000));
}

/**
 * Cronómetro de atención. Basado en marcas de tiempo (no en contar ticks),
 * por lo que es exacto aunque la pestaña esté en segundo plano o el modal se cierre.
 * onChange entrega los minutos y el estado cada vez que cambia.
 */
export default function AtencionTimer({
  onChange,
}: { onChange: (minutes: number, status: TimerStatus) => void }) {
  const [st, setSt] = useState<Stored>(EMPTY);
  const [now, setNow] = useState(() => Date.now());
  const ready = useRef(false);

  useEffect(() => { setSt(load()); ready.current = true; }, []);

  useEffect(() => {
    if (st.status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [st.status]);

  const elapsed = st.accMs + (st.status === "running" && st.startedAt ? now - st.startedAt : 0);
  const minutes = msToMinutes(elapsed);

  useEffect(() => {
    if (ready.current) onChange(st.status === "stopped" ? minutes : 0, st.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.status, minutes]);

  function apply(next: Stored) { setSt(next); save(next); setNow(Date.now()); }
  const start = () => apply({ status: "running", accMs: st.accMs, startedAt: Date.now() });
  const pause = () => apply({ status: "paused", accMs: elapsed, startedAt: null });
  const stop = () => apply({ status: "stopped", accMs: elapsed, startedAt: null });
  const resume = start;
  const reset = () => { clearAtencionTimer(); apply(EMPTY); };

  const label = { idle: "Listo para iniciar", running: "Atención en curso", paused: "En pausa", stopped: "Sesión finalizada" }[st.status];

  return (
    <div className={`timer-box timer-${st.status}`}>
      <div className="timer-top">
        <span className="timer-state"><span className="timer-dot" /> {label}</span>
        {st.status !== "idle" && <button type="button" className="timer-link" onClick={reset}>Descartar</button>}
      </div>
      <div className="timer-clock" aria-live="off">{fmtClock(elapsed)}</div>
      <div className="timer-actions">
        {st.status === "idle" && <button type="button" className="btn btn-primary" onClick={start}>▶ Iniciar atención</button>}
        {st.status === "running" && (<>
          <button type="button" className="btn" onClick={pause}>⏸ Pausar</button>
          <button type="button" className="btn btn-danger-solid" onClick={stop}>■ Detener</button>
        </>)}
        {st.status === "paused" && (<>
          <button type="button" className="btn btn-primary" onClick={resume}>▶ Reanudar</button>
          <button type="button" className="btn btn-danger-solid" onClick={stop}>■ Detener</button>
        </>)}
        {st.status === "stopped" && (
          <span className="timer-result">Se registrarán <b>{minutes} min</b> · <button type="button" className="timer-link" onClick={resume}>Reanudar</button></span>
        )}
      </div>
    </div>
  );
}

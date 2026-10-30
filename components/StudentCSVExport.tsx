"use client";

type Row = {
  nombre: string; matricula: string; carrera: string; seccion?: string | null; email?: string | null; telefono?: string | null;
  inasistencias: number; rendimiento: string; evaluacionesPerdidas: number; riesgoManual: string | null; abandono: boolean;
};

const HEAD = ["nombre", "matricula", "carrera", "seccion", "email", "telefono", "inasistencias", "rendimiento", "evaluacionesPerdidas", "riesgo", "abandono"];

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const DownloadIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);

// Genera el CSV con las mismas columnas que la plantilla de importación,
// así lo exportado se puede volver a importar sin cambiar nada.
export default function StudentCSVExport({ students }: { students: Row[] }) {
  function exportar() {
    const lines = [HEAD.join(",")].concat(
      students.map((s) =>
        [s.nombre, s.matricula, s.carrera, s.seccion ?? "", s.email ?? "", s.telefono ?? "", s.inasistencias, s.rendimiento,
          s.evaluacionesPerdidas, s.riesgoManual ?? "", s.abandono ? "si" : "no"].map(cell).join(",")
      )
    );
    const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `estudiantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="btn btn-outline-primary" onClick={exportar} disabled={students.length === 0}>
      <DownloadIcon /> Exportar CSV
    </button>
  );
}

"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export function TipoDuracionChart({ data }: { data: { tipo: string; prom: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F3" vertical={false} />
        <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [`${v} min`, "Promedio"]} />
        <Bar dataKey="prom" fill="#2C7A7B" radius={[5, 5, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EstadoCasosChart({ abiertos, seguimiento, cerrados }: { abiertos: number; seguimiento: number; cerrados: number }) {
  const data = [
    { name: "Abiertos", value: abiertos, color: "#3B82C4" },
    { name: "En seguimiento", value: seguimiento, color: "#B8860B" },
    { name: "Cerrados", value: cerrados, color: "#2F9E44" },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Legend iconSize={9} wrapperStyle={{ fontSize: 11.5 }} />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RiesgoChart({ verde, amarillo, rojo }: { verde: number; amarillo: number; rojo: number }) {
  const data = [
    { name: "Sin riesgo", value: verde, color: "#2F9E44" },
    { name: "Riesgo medio", value: amarillo, color: "#B8860B" },
    { name: "Riesgo alto", value: rojo, color: "#D14343" },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Legend iconSize={9} wrapperStyle={{ fontSize: 11.5 }} />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

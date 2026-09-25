import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  await prisma.derivacion.deleteMany();
  await prisma.atencion.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  // Usuario de prueba para iniciar sesión (correo institucional obligatorio).
  await prisma.user.create({
    data: {
      nombre: "Coord. Paula Vidal",
      email: "paula.vidal@inacapmail.cl",
      password: await bcrypt.hash("inacap2026", 10),
    },
  });

  const camila = await prisma.student.create({
    data: { nombre: "Camila Rojas Fuentes", matricula: "2022-0143", carrera: "Ingeniería Comercial", seccion: "Sección A", email: "camila.rojas@alumnos.cl", inasistencias: 5, rendimiento: "bajo", evaluacionesPerdidas: 2 },
  });
  const matias = await prisma.student.create({
    data: { nombre: "Matías Sepúlveda León", matricula: "2021-0087", carrera: "Psicología", seccion: "Sección B", email: "matias.sepulveda@alumnos.cl", inasistencias: 1, rendimiento: "alto", evaluacionesPerdidas: 0 },
  });
  const fernanda = await prisma.student.create({
    data: { nombre: "Fernanda Alarcón Díaz", matricula: "2023-0212", carrera: "Ingeniería Comercial", email: "fernanda.alarcon@alumnos.cl", inasistencias: 3, rendimiento: "medio", evaluacionesPerdidas: 1 },
  });
  const valentina = await prisma.student.create({
    data: { nombre: "Valentina Muñoz Silva", matricula: "2022-0199", carrera: "Psicología", email: "valentina.munoz@alumnos.cl", inasistencias: 6, rendimiento: "bajo", evaluacionesPerdidas: 2, abandono: true },
  });

  await prisma.atencion.create({
    data: { studentId: camila.id, fecha: daysAgo(30), responsable: "Coord. Paula Vidal", tipo: "Académica", tema: "Bajo rendimiento en Cálculo II", duracionMin: 35, observaciones: "Se revisó plan de estudio y carga académica.", acuerdos: "Reforzar con tutorías los martes.", estado: "seguimiento", fechaSeguimientoComprometido: daysAgo(9), updatedAt: daysAgo(9) },
  });
  await prisma.atencion.create({
    data: { studentId: camila.id, fecha: daysAgo(3), responsable: "Coord. Paula Vidal", tipo: "Personal", tema: "Dificultades de organización de tiempo", duracionMin: 20, observaciones: "Estudiante compatibiliza trabajo y estudios.", estado: "abierto", fechaSeguimientoComprometido: daysAgo(-11) },
  });
  await prisma.atencion.create({
    data: { studentId: matias.id, fecha: daysAgo(18), responsable: "Coord. Paula Vidal", tipo: "Financiera", tema: "Consulta sobre beca", duracionMin: 15, observaciones: "Consulta directa sobre postulación a beca de excelencia.", estado: "cerrado", resueltoPrimerContacto: true, fechaCierre: daysAgo(18) },
  });
  const atFernanda = await prisma.atencion.create({
    data: { studentId: fernanda.id, fecha: daysAgo(5), responsable: "Coord. Ana Fernández", tipo: "Académica", tema: "Inasistencias reiteradas", duracionMin: 20, observaciones: "Persisten inasistencias, se deriva a psicosocial.", estado: "abierto", fechaSeguimientoComprometido: daysAgo(-2) },
  });
  await prisma.atencion.create({
    data: { studentId: valentina.id, fecha: daysAgo(60), responsable: "Coord. Paula Vidal", tipo: "Personal", tema: "Situación familiar compleja", duracionMin: 45, estado: "seguimiento", fechaSeguimientoComprometido: daysAgo(-20), seguimientoCumplido: false },
  });

  await prisma.derivacion.create({
    data: { studentId: fernanda.id, atencionId: atFernanda.id, area: "Área psicosocial", fecha: daysAgo(5), estado: "en-gestion", notas: "Derivada por inasistencias reiteradas y posible causa personal." },
  });

  console.log("Datos de ejemplo creados ✔");
}

main().finally(() => prisma.$disconnect());

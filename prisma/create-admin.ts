// Crea (o actualiza) la cuenta administradora admin@inacapmail.cl SIN tocar ningún otro dato.
// A diferencia de `npm run db:seed`, no borra nada, así que es seguro en producción.
//
//   ADMIN_PASSWORD="tu-clave-segura" npm run db:admin
//
// - Si la cuenta no existe, se crea (con ADMIN_PASSWORD, o con una clave aleatoria que se imprime aquí).
// - Si ya existe, solo se cambia su contraseña cuando defines ADMIN_PASSWORD.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { ADMIN_EMAIL, MIN_PASSWORD_LENGTH } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  const given = process.env.ADMIN_PASSWORD;
  if (given && given.length < MIN_PASSWORD_LENGTH) throw new Error(`ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing && !given) {
    console.log(`La cuenta ${ADMIN_EMAIL} ya existe. No se cambió nada (define ADMIN_PASSWORD para cambiar su contraseña).`);
    return;
  }

  const password = given ?? randomBytes(9).toString("base64url");
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { nombre: "Administrador", email: ADMIN_EMAIL, password: hash },
    update: { password: hash, failedAttempts: 0 },
  });
  console.log(`Cuenta ${ADMIN_EMAIL} ${existing ? "actualizada" : "creada"} ✔`);
  if (!given) console.log(`Contraseña inicial (cámbiala al entrar): ${password}`);
}

main().finally(() => prisma.$disconnect());

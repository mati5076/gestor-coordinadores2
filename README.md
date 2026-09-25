# Seguimiento — Gestión de Atención Estudiantil

Versión Next.js + TypeScript + Prisma de la app de seguimiento estudiantil.

## Por qué esta pila y no Astro

Astro brilla en sitios donde la mayor parte de la página es contenido estático
(blogs, marketing, documentación) y solo hay pequeñas islas interactivas.
Esta app es lo opuesto: dashboard con KPIs en vivo, tablas filtrables,
modales, formularios y gráficos — prácticamente todo es dinámico. Con Astro
terminarías metiendo casi toda la app dentro de una sola isla de React,
perdiendo su ventaja principal (poco JS enviado al cliente) sin ganar nada.

**Next.js (App Router)** encaja mejor porque:
- Los *Server Components* leen la base de datos directamente en el servidor
  (`app/page.tsx`, `app/estudiantes/page.tsx`, etc.) sin necesidad de armar
  una API REST intermedia.
- Los *Server Actions* (`app/estudiantes/actions.ts`, `app/atenciones/actions.ts`)
  permiten que los formularios llamen funciones del servidor directamente.
- Es el framework de React con más soporte, documentación y comunidad —
  relevante si más adelante suman más desarrolladores al proyecto.

## Base de datos

Se usa **SQLite** vía **Prisma** por defecto: es un solo archivo
(`prisma/dev.db`), cero configuración, perfecto para desarrollo o para un
equipo pequeño que corre la app en un solo servidor. A diferencia de la
primera versión (HTML + almacenamiento por usuario), aquí **todos los
coordinadores comparten la misma base de datos**.

Cuando necesites multiusuario concurrente en producción real, cambia en
`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // en vez de "sqlite"
  url      = env("DATABASE_URL")
}
```

y apunta `DATABASE_URL` a Postgres (por ejemplo con [Supabase](https://supabase.com)
o [Neon](https://neon.tech), ambos con plan gratuito). El resto del código
(lib/logic.ts, las páginas, las server actions) no cambia nada.

## Cómo correrlo

```bash
npm install
npx prisma db push     # crea las tablas en prisma/dev.db (incluye la tabla User)
npm run db:seed        # carga estudiantes, atenciones y un usuario de ejemplo
npm run dev             # http://localhost:3000
```

Te va a redirigir a `/login`. Puedes entrar con el usuario de ejemplo del seed:

- **Correo:** `paula.vidal@inacapmail.cl`
- **Contraseña:** `inacap2026`

O crear una cuenta nueva en `/registro` (solo se aceptan correos que terminen
en `@inacapmail.cl`).

## Autenticación

- Solo se puede iniciar sesión o registrarse con correos que terminan en
  **`@inacapmail.cl`** (`lib/auth.ts` → `ALLOWED_EMAIL_DOMAIN`). Cambia esa
  constante si el dominio institucional es otro.
- Las contraseñas se guardan hasheadas con `bcryptjs` (tabla `User` en
  `prisma/schema.prisma`).
- La sesión se guarda en una cookie httpOnly firmada (HMAC-SHA256, sin
  librerías externas de sesión) — ver `lib/auth.ts`. La clave de firma vive
  en la variable de entorno `AUTH_SECRET` (`.env`); en producción cámbiala
  por una propia (`openssl rand -hex 32`).
- `middleware.ts` protege **todas** las rutas salvo `/login` y `/registro`:
  sin sesión válida, redirige a `/login`.
- El botón ⏻ en la parte inferior del sidebar cierra sesión
  (`app/login/actions.ts` → `logoutAction`).

## Alertas emergentes de riesgo

Al entrar a la app (o recargar), aparece arriba a la derecha una notificación
emergente por cada estudiante en riesgo (medio o alto, sin abandono
registrado): *"Alerta — Alumno con riesgo, favor de poder hacer seguimiento
al alumno (nombre)"*. Cada una se cierra con la **×** y desaparece; una vez
cerrada no vuelve a aparecer mientras sigas navegando en esa pestaña
(se recuerda en `sessionStorage`, se reinicia al cerrar la pestaña o abrir
una nueva).

- `lib/risk-alerts.ts` → `getHighRiskStudents()`: calcula la lista en el
  servidor con la misma lógica de riesgo de `lib/logic.ts`.
- `components/RiskAlertToasts.tsx`: dibuja las tarjetas apiladas y maneja
  el cierre.
- Se monta una sola vez en `components/AppShell.tsx`, así que se ve en
  cualquier pantalla protegida (no en `/login` ni `/registro`).

## Estructura

```
app/
  page.tsx                 → Panel general (dashboard + KPIs + gráficos)
  estudiantes/
    page.tsx                → Lista de estudiantes
    [id]/page.tsx            → Ficha con historial (timeline)
    actions.ts               → Server actions: crear/editar/eliminar
  atenciones/
    page.tsx                 → Lista de atenciones
    actions.ts                → Server actions: crear/editar/eliminar
  alertas/
    page.tsx                  → Alertas automáticas priorizadas
lib/
  logic.ts                    → Riesgo, alertas y los 8 KPIs (el "cerebro")
  prisma.ts                    → Cliente de base de datos
components/
  ui.tsx                        → RiskChip, EstadoBadge, Topbar, helpers
  Sidebar.tsx                    → Navegación
  StudentFormModal.tsx             → Modal crear/editar estudiante
  AtencionFormModal.tsx             → Modal crear/editar atención
  DashboardCharts.tsx                → Gráficos (recharts)
prisma/
  schema.prisma                       → Modelos: Student, Atencion, Derivacion
  seed.ts                              → Datos de ejemplo
```

## Cómo agregar lo que falta

El modelo `Derivacion` ya existe en `prisma/schema.prisma`, pero para no
duplicar código en exceso en este scaffold no se implementó su UI. Para
completarla, copia el patrón de `app/atenciones/` (page.tsx + actions.ts +
un `DerivacionFormModal.tsx` calcado de `AtencionFormModal.tsx`) — son
literalmente los mismos cuatro archivos, cambiando los campos del formulario
por los de `Derivacion` (área, estado, notas, fecha de resolución).

Lo mismo aplica para **Reportes** (filtro por rango de fechas + los mismos
`computeKPIs()` de `lib/logic.ts`, ya soporta recibir un subconjunto de
atenciones filtrado por fecha).

La autenticación ya está implementada (ver sección "Autenticación" arriba).
Si más adelante quieres roles distintos ("coordinador" / "director"), agrega
un campo `rol` al modelo `User` en `prisma/schema.prisma` y guárdalo también
en el payload de la sesión (`lib/auth.ts` → `createSessionToken`).

## Producción

- `npm run build && npm start`, o despliega en [Vercel](https://vercel.com)
  (un clic, detecta Next.js automáticamente). Si usas SQLite necesitarás un
  volumen persistente o migrar a Postgres — en plataformas serverless como
  Vercel, Postgres es la opción práctica.

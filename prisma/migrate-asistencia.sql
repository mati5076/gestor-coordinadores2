-- ============================================================================
-- Migración: "inasistencias" (cantidad de faltas)  →  "asistencia" (% 0–100)
--
-- EJECUTAR UNA VEZ en el SQL Editor de Supabase ANTES de `npx prisma db push`.
-- (`db push` trataría el cambio como "borrar columna + crear columna" y se
--  perderían los datos; este script los convierte primero.)
--
-- Conversión de los datos existentes: cada falta se descuenta como 6 puntos
-- porcentuales (100 − faltas × 6). Con los umbrales nuevos (< 75 % crítica,
-- < 85 % baja) esto deja el riesgo de cada estudiante igual que antes
-- (5+ faltas → crítica, 3–4 faltas → baja). Ajusta el 6 si prefieres otro
-- criterio, o corrige los porcentajes reales después desde la app / CSV.
-- ============================================================================
BEGIN;

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "asistencia" DOUBLE PRECISION NOT NULL DEFAULT 100;

-- Se ejecuta solo si la columna vieja todavía existe (así el script se puede repetir sin error).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Student' AND column_name = 'inasistencias'
  ) THEN
    EXECUTE 'UPDATE "Student" SET "asistencia" = GREATEST(0, 100 - "inasistencias" * 6)';
  END IF;
END $$;

ALTER TABLE "Student" DROP COLUMN IF EXISTS "inasistencias";

COMMIT;

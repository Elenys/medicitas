-- RN-21.7 — separación mínima entre las citas de un mismo paciente.
-- Entre dos citas activas del mismo paciente debe haber al menos
-- PATIENT_APPOINTMENT_GAP_MINUTES (60) minutos libres, aunque sean con médicos
-- distintos. Reemplaza y amplía la antigua restricción de no solapamiento.

-- La EXCLUDE compara los dos rangos ya ampliados, así que cada fila se amplía la
-- MITAD del margen a cada lado: 30 + 30 = los 60 minutos exigidos. Dos citas
-- separadas por exactamente 60 minutos generan rangos que se tocan pero no se
-- solapan (límite '[)'), y por eso se aceptan.
--
-- El índice exige una expresión IMMUTABLE y `timestamptz - interval` es STABLE
-- (depende de la zona horaria cuando el intervalo trae meses o días). Con un
-- intervalo de minutos fijos el resultado sí es invariable, así que se encapsula
-- en esta función para poder declararlo.
CREATE OR REPLACE FUNCTION appointment_patient_gap_range(starts_at timestamptz, ends_at timestamptz)
  RETURNS tstzrange
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
AS $$
  SELECT tstzrange(starts_at - interval '30 minutes', ends_at + interval '30 minutes', '[)');
$$;

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS appointments_patient_no_overlap;

ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_patient_min_gap
  EXCLUDE USING gist (
    patient_id WITH =,
    appointment_patient_gap_range(starts_at, ends_at) WITH &&
  ) WHERE (status <> 'CANCELLED');

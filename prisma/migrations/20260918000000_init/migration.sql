-- MediCitas — migración inicial (especificacion/03-modelo-de-datos.md)
-- Parte 1: generada desde schema.prisma. Parte 2: restricciones que Prisma no expresa.

CREATE EXTENSION IF NOT EXISTS btree_gist;


-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('CC', 'TI', 'CE', 'PA');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('FEMALE', 'MALE', 'OTHER');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('APPOINTMENT_BOOKED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_COMPLETED', 'ACCOUNT_CREATED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "role" "user_role" NOT NULL,
    "document_type" "document_type" NOT NULL,
    "document_number" VARCHAR(20) NOT NULL,
    "first_name" VARCHAR(60) NOT NULL,
    "last_name" VARCHAR(60) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(15),
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "id" SMALLSERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "birth_date" DATE NOT NULL,
    "gender" "gender" NOT NULL,
    "address" VARCHAR(120),
    "health_provider" VARCHAR(80),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "specialty_id" SMALLINT NOT NULL,
    "license_number" VARCHAR(30) NOT NULL,
    "appointment_duration_minutes" SMALLINT NOT NULL DEFAULT 30,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_schedules" (
    "id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,

    CONSTRAINT "doctor_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "reason" VARCHAR(255),
    "status" "appointment_status" NOT NULL DEFAULT 'BOOKED',
    "notes" TEXT,
    "cancellation_reason" VARCHAR(255),
    "cancelled_by_user_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "type" "notification_type" NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role_active" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_document_unique" ON "users"("document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_name_unique" ON "specialties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_unique" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_user_unique" ON "doctors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_license_unique" ON "doctors"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_schedules_slot_unique" ON "doctor_schedules"("doctor_id", "weekday", "start_time");

-- CreateIndex
CREATE INDEX "idx_appointments_patient_starts_at" ON "appointments"("patient_id", "starts_at" DESC);

-- CreateIndex
CREATE INDEX "idx_appointments_doctor_starts_at" ON "appointments"("doctor_id", "starts_at");

-- CreateIndex
CREATE INDEX "idx_appointments_status" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_user_unread" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- =====================================================================
-- Parte 2 — Restricciones de negocio en el motor
-- =====================================================================

-- Verificaciones (CHECK) — especificacion/03 §5.3
ALTER TABLE "users"
  ADD CONSTRAINT users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

ALTER TABLE "patients"
  ADD CONSTRAINT patients_birth_date_range
  CHECK (birth_date BETWEEN DATE '1900-01-01' AND CURRENT_DATE);

ALTER TABLE "doctors"
  ADD CONSTRAINT doctors_duration_range CHECK (appointment_duration_minutes BETWEEN 10 AND 120);

ALTER TABLE "doctor_schedules"
  ADD CONSTRAINT doctor_schedules_weekday_range CHECK (weekday BETWEEN 1 AND 7),
  ADD CONSTRAINT doctor_schedules_time_range CHECK (end_time > start_time);

ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_time_range CHECK (ends_at > starts_at),
  -- Una cita cancelada tiene motivo; una que no lo está, no lo arrastra.
  ADD CONSTRAINT appointments_cancellation_consistency CHECK (
    (status = 'CANCELLED' AND cancellation_reason IS NOT NULL) OR
    (status <> 'CANCELLED' AND cancellation_reason IS NULL)
  );

-- No solapamiento (EXCLUDE) — especificacion/03 §5.2, RN-22
-- Ningún médico puede tener dos citas activas que se solapen.
ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_doctor_no_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');

-- Ningún paciente puede tener dos citas activas que se solapen.
ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_patient_no_overlap
  EXCLUDE USING gist (
    patient_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');

-- Mantenimiento de updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

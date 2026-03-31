-- ═══════════════════════════════════════════════════════════════════════════
--  Plataforma NOM-035 STPS 2018 — Inicialización de Base de Datos
--  Este script se ejecuta automáticamente al iniciar el contenedor MySQL
-- ═══════════════════════════════════════════════════════════════════════════

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS nom035_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE nom035_db;

-- El schema completo se aplica mediante las migraciones de Drizzle
-- Ver: drizzle/migrations/
-- Ejecutar: pnpm drizzle-kit migrate

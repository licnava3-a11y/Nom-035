#!/usr/bin/env node
/**
 * Script de configuración inicial — Plataforma NOM-035 STPS 2018
 *
 * Uso:
 *   node scripts/setup-admin.mjs
 *
 * Crea el primer usuario administrador en la base de datos.
 * Solo funciona cuando LOCAL_AUTH=true y no existe ningún admin.
 */

import { createInterface } from "readline";
import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import "dotenv/config";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Plataforma NOM-035 STPS 2018 — Configuración Inicial    ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Verificar modo de autenticación
  if (process.env.LOCAL_AUTH !== "true") {
    console.error("❌ Este script solo funciona con LOCAL_AUTH=true en el archivo .env");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL no está configurado en el archivo .env");
    process.exit(1);
  }

  // Conectar a la base de datos
  let conn;
  try {
    conn = await createConnection(dbUrl);
    console.log("✅ Conexión a la base de datos establecida\n");
  } catch (err) {
    console.error("❌ No se pudo conectar a la base de datos:", err.message);
    console.error("   Verifica que DATABASE_URL sea correcto y que MySQL esté corriendo.");
    process.exit(1);
  }

  // Verificar si ya existe un admin
  const [admins] = await conn.execute(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );
  if (admins.length > 0) {
    console.log("ℹ️  Ya existe un administrador en el sistema.");
    console.log("   Si necesitas crear otro, hazlo desde el panel de administración.\n");
    await conn.end();
    rl.close();
    return;
  }

  console.log("No se encontró ningún administrador. Vamos a crear el primero.\n");

  // Solicitar datos del administrador
  const name = await ask("Nombre completo del administrador: ");
  const email = await ask("Correo electrónico: ");

  let password = "";
  while (password.length < 8) {
    password = await ask("Contraseña (mínimo 8 caracteres): ");
    if (password.length < 8) {
      console.log("  ⚠️  La contraseña debe tener al menos 8 caracteres.");
    }
  }

  // Confirmar
  console.log("\n─── Resumen ────────────────────────────────────────────────");
  console.log(`  Nombre:  ${name}`);
  console.log(`  Email:   ${email}`);
  console.log(`  Rol:     admin`);
  console.log("────────────────────────────────────────────────────────────");

  const confirm = await ask("\n¿Confirmar creación? (s/N): ");
  if (!confirm.toLowerCase().startsWith("s")) {
    console.log("\nOperación cancelada.");
    await conn.end();
    rl.close();
    return;
  }

  // Crear usuario
  const passwordHash = await bcrypt.hash(password, 12);
  const openId = `local_${Date.now()}_${randomBytes(8).toString("hex")}`;

  await conn.execute(
    `INSERT INTO users (openId, name, email, loginMethod, role, departamento, passwordHash, lastSignedIn, createdAt, updatedAt)
     VALUES (?, ?, ?, 'local', 'admin', 'Administración', ?, NOW(), NOW(), NOW())`,
    [openId, name.trim(), email.toLowerCase().trim(), passwordHash]
  );

  console.log("\n✅ Administrador creado exitosamente.");
  console.log("   Ahora puedes iniciar sesión en la plataforma con:");
  console.log(`   Email:     ${email}`);
  console.log("   Contraseña: (la que ingresaste)\n");

  await conn.end();
  rl.close();
}

main().catch((err) => {
  console.error("\n❌ Error inesperado:", err.message);
  process.exit(1);
});

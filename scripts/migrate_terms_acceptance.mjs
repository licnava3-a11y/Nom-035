import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const sql = `
CREATE TABLE IF NOT EXISTS terms_acceptance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_terms_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

try {
  await conn.execute(sql);
  console.log("✅ Tabla terms_acceptance creada correctamente");
} catch (err) {
  if (err.code === "ER_TABLE_EXISTS_ERROR") {
    console.log("ℹ️  La tabla terms_acceptance ya existe");
  } else {
    console.error("❌ Error:", err.message);
  }
} finally {
  await conn.end();
}

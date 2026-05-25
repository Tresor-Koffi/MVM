const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin', 'secretaire', 'visiteur')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS preachers (
      id SERIAL PRIMARY KEY,
      prenom TEXT NOT NULL,
      nom TEXT NOT NULL,
      date_naissance TEXT,
      lieu_naissance TEXT,
      nationalite TEXT,
      situation_matrimoniale TEXT,
      telephone1 TEXT,
      telephone2 TEXT,
      email TEXT,
      adresse TEXT,
      pere_nom TEXT,
      pere_telephone TEXT,
      pere_statut TEXT,
      mere_nom TEXT,
      mere_telephone TEXT,
      mere_statut TEXT,
      conjoint_nom TEXT,
      conjoint_telephone TEXT,
      nombre_enfants INTEGER DEFAULT 0,
      fonction TEXT,
      pays_affectation TEXT,
      eglise_locale TEXT,
      date_bapteme TEXT,
      urgence1_nom TEXT,
      urgence1_lien TEXT,
      urgence1_telephone TEXT,
      urgence2_nom TEXT,
      urgence2_lien TEXT,
      urgence2_telephone TEXT,
      groupe_sanguin TEXT,
      photo TEXT,
      statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('en_attente', 'valide', 'rejete')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      validated_by INTEGER REFERENCES users(id),
      validated_at TIMESTAMP
    )
  `);

  // Partial unique indexes — safe to run on every startup
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_preachers_telephone1
    ON preachers(telephone1)
    WHERE telephone1 IS NOT NULL AND telephone1 <> ''
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_preachers_email
    ON preachers(email)
    WHERE email IS NOT NULL AND email <> ''
  `);

  // Seed default users once
  const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM users');
  if (parseInt(rows[0].cnt) === 0) {
    const sql = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)';
    await pool.query(sql, ['superadmin', bcrypt.hashSync('admin123', 10), 'superadmin']);
    await pool.query(sql, ['secretaire', bcrypt.hashSync('sec123', 10),  'secretaire']);
    await pool.query(sql, ['visiteur',   bcrypt.hashSync('vis123', 10),  'visiteur']);
    console.log('Default admin accounts created.');
  }

  console.log('Database ready.');
}

async function dbRun(sql, params = []) {
  const result = await pool.query(sql, params);
  return { lastID: result.rows[0]?.id ?? null, rowCount: result.rowCount };
}

async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] ?? null;
}

async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

module.exports = { pool, initDb, dbRun, dbGet, dbAll };

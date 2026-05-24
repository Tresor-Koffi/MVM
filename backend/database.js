const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'mvm.db');
let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error('DB connection error:', err);
      else console.log('Connected to SQLite database.');
    });
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA foreign_keys = ON');
      initSchema();
    });
  }
  return db;
}

function initSchema() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin', 'secretaire', 'visiteur')),
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS preachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      validated_by INTEGER REFERENCES users(id),
      validated_at TEXT
    )`);

    // Seed default users
    db.get('SELECT COUNT(*) as cnt FROM users', (err, row) => {
      if (err || row.cnt > 0) return;
      const accounts = [
        ['superadmin', bcrypt.hashSync('admin123', 10), 'superadmin'],
        ['secretaire', bcrypt.hashSync('sec123', 10), 'secretaire'],
        ['visiteur', bcrypt.hashSync('vis123', 10), 'visiteur'],
      ];
      const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
      accounts.forEach(([u, p, r]) => stmt.run(u, p, r));
      stmt.finalize();
      console.log('Default admin accounts created.');
    });

    // Run schema migrations for existing databases
    runMigrations();
  });
}

function runMigrations() {
  db.all('PRAGMA table_info(preachers)', (err, columns) => {
    if (err || !columns || columns.length === 0) return;
    const colNames = columns.map(c => c.name);

    if (colNames.includes('zone_affectation') && !colNames.includes('pays_affectation')) {
      db.run('ALTER TABLE preachers RENAME COLUMN zone_affectation TO pays_affectation', (e) => {
        if (e) console.error('Migration error (rename zone_affectation):', e.message);
        else console.log('Migration: zone_affectation → pays_affectation');
      });
    }

    ['grade', 'ministere', 'date_ordination', 'lieu_ordination', 'formations', 'allergies'].forEach(col => {
      if (colNames.includes(col)) {
        db.run(`ALTER TABLE preachers DROP COLUMN ${col}`, (e) => {
          if (e) console.error(`Migration error (drop ${col}):`, e.message);
          else console.log(`Migration: dropped column ${col}`);
        });
      }
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { getDb, dbRun, dbGet, dbAll };

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH || '/app/data/sf_desktop.db';

let _db;

function hasColumn(db, tableName, columnName) {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return cols.some((c) => c.name === columnName);
}

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

// Kompatible query()-Funktion: gibt Array zurück (wie mysql2)
export async function query(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (stmt.reader) {
    return stmt.all(...params);
  }
  stmt.run(...params);
  return [];
}

export async function initDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      can_read INTEGER NOT NULL DEFAULT 1,
      can_edit INTEGER NOT NULL DEFAULT 0,
      can_create INTEGER NOT NULL DEFAULT 0,
      can_delete INTEGER NOT NULL DEFAULT 0,
      can_manage_groups INTEGER NOT NULL DEFAULT 0,
      auth_level INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS authorization_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      level INTEGER NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      image_url TEXT,
      rank_name TEXT,
      unit_id INTEGER,
      auth_level INTEGER NOT NULL DEFAULT 1,
      group_id INTEGER NOT NULL,
      notes TEXT,
      login_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES user_groups(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    CREATE TABLE IF NOT EXISTS strafakten (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_name TEXT NOT NULL,
      person_id TEXT NOT NULL,
      unit_name TEXT NOT NULL,
      service_rank TEXT NOT NULL,
      crime TEXT NOT NULL,
      punishment TEXT NOT NULL,
      penalty_level TEXT NOT NULL,
      auth_level INTEGER NOT NULL DEFAULT 1,
      status_label TEXT NOT NULL DEFAULT 'Nicht Begonnen',
      unit_id INTEGER,
      image_url TEXT,
      notes TEXT,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES staff(id),
      FOREIGN KEY (updated_by) REFERENCES staff(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    CREATE TABLE IF NOT EXISTS strafakten_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strafakte_id INTEGER,
      action_type TEXT NOT NULL,
      actor_staff_pk INTEGER NOT NULL,
      actor_staff_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      changes_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (strafakte_id) REFERENCES strafakten(id),
      FOREIGN KEY (actor_staff_pk) REFERENCES staff(id)
    );
  `);

  // Migrationen fuer bestehende DB-Dateien
  if (!hasColumn(db, 'user_groups', 'auth_level')) {
    db.exec('ALTER TABLE user_groups ADD COLUMN auth_level INTEGER NOT NULL DEFAULT 1');
  }
  if (!hasColumn(db, 'staff', 'unit_id')) {
    db.exec('ALTER TABLE staff ADD COLUMN unit_id INTEGER');
  }
  if (!hasColumn(db, 'staff', 'auth_level')) {
    db.exec('ALTER TABLE staff ADD COLUMN auth_level INTEGER NOT NULL DEFAULT 1');
  }
  if (!hasColumn(db, 'strafakten', 'auth_level')) {
    db.exec('ALTER TABLE strafakten ADD COLUMN auth_level INTEGER NOT NULL DEFAULT 1');
  }
  if (!hasColumn(db, 'strafakten', 'unit_id')) {
    db.exec('ALTER TABLE strafakten ADD COLUMN unit_id INTEGER');
  }

  db.exec("INSERT OR IGNORE INTO units (name) VALUES ('Unbekannt')");
  const fallbackUnit = db.prepare("SELECT id FROM units WHERE name = 'Unbekannt'").get();

  db.exec(`
    INSERT OR IGNORE INTO authorization_levels (name, level)
    VALUES
      ('Offen', 1),
      ('Intern', 3),
      ('Vertraulich', 7),
      ('Geheim', 10)
  `);
  db.exec(`INSERT OR IGNORE INTO authorization_levels (name, level)
      VALUES
        ('Offen', 1),
        ('Intern', 3),
        ('Vertraulich', 7),
        ('Geheim', 10)
    `);

  db.exec(`
    INSERT OR IGNORE INTO units (name)
    SELECT DISTINCT TRIM(unit_name) FROM strafakten
    WHERE unit_name IS NOT NULL AND TRIM(unit_name) <> ''
  `);
  db.exec(`INSERT OR IGNORE INTO units (name)
      SELECT DISTINCT TRIM(unit_name) FROM strafakten
      WHERE unit_name IS NOT NULL AND TRIM(unit_name) <> ''
    `);

  db.exec(`
    UPDATE strafakten
    SET unit_id = (
      SELECT u.id FROM units u WHERE u.name = strafakten.unit_name
    )
    WHERE unit_id IS NULL AND unit_name IS NOT NULL AND TRIM(unit_name) <> ''
  `);
  db.exec(`UPDATE strafakten
      SET unit_id = (
        SELECT u.id FROM units u WHERE u.name = strafakten.unit_name
      )
      WHERE unit_id IS NULL AND unit_name IS NOT NULL AND TRIM(unit_name) <> ''
    `);

  db.prepare('UPDATE staff SET unit_id = ? WHERE unit_id IS NULL').run(fallbackUnit.id);
  db.prepare('UPDATE strafakten SET unit_id = ? WHERE unit_id IS NULL').run(fallbackUnit.id);

  // Gruppen sicherstellen
  db.exec(`
    INSERT OR IGNORE INTO user_groups (name, can_read, can_edit, can_create, can_delete, can_manage_groups, auth_level)
    VALUES
      ('Superadmin', 1, 1, 1, 1, 1, 10),
      ('Admin',      1, 1, 1, 1, 0, 7),
      ('User',       1, 0, 0, 0, 0, 1);
  `);
  db.exec(`INSERT OR IGNORE INTO user_groups (name, can_read, can_edit, can_create, can_delete, can_manage_groups, auth_level)
      VALUES
        ('Superadmin', 1, 1, 1, 1, 1, 10),
        ('Admin',      1, 1, 1, 1, 0, 7),
        ('User',       1, 0, 0, 0, 0, 1)
    `);

  db.exec(`
    UPDATE user_groups SET auth_level = CASE name
      WHEN 'Superadmin' THEN 10
      WHEN 'Admin' THEN 7
      WHEN 'User' THEN 1
      ELSE auth_level
    END
  `);
  db.exec(`UPDATE user_groups SET auth_level = CASE name
      WHEN 'Superadmin' THEN 10
      WHEN 'Admin' THEN 7
      WHEN 'User' THEN 1
      ELSE auth_level
    END`);

  // Standardbenutzer anlegen falls nicht vorhanden
  const existing = db.prepare("SELECT id FROM staff WHERE staff_id = 'A-1001'").get();
  if (!existing) {
    const superadmin = db.prepare("SELECT id FROM user_groups WHERE name = 'Superadmin'").get();
    const passwordHash = await bcrypt.hash('1234', 10);
    db.prepare(
      `INSERT INTO staff (staff_id, first_name, last_name, password_hash, image_url, rank_name, group_id, notes, login_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).run('A-1001', 'System', 'Admin', passwordHash, 'https://i.pravatar.cc/300?img=12', 'Leitung', superadmin.id, 'Initialer Systemzugang');
    db.prepare(`INSERT INTO staff (staff_id, first_name, last_name, password_hash, image_url, rank_name, group_id, notes, login_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run('A-1001', 'System', 'Admin', passwordHash, 'https://i.pravatar.cc/300?img=12', 'Leitung', superadmin.id, 'Initialer Systemzugang');
  }

  // A-1001 immer als Superadmin sicherstellen
  db.prepare(`
    UPDATE staff SET group_id = (SELECT id FROM user_groups WHERE name = 'Superadmin')
    WHERE staff_id = 'A-1001'
  `).run();
  db.prepare(`UPDATE staff SET group_id = (SELECT id FROM user_groups WHERE name = 'Superadmin') WHERE staff_id = 'A-1001'`).run();

  db.prepare(`
    UPDATE staff
    SET auth_level = (
      SELECT auth_level FROM user_groups g WHERE g.id = staff.group_id
    )
    WHERE auth_level IS NULL OR auth_level < 1
  `).run();
  db.prepare(`UPDATE staff
      SET auth_level = (
        SELECT auth_level FROM user_groups g WHERE g.id = staff.group_id
      )
      WHERE auth_level IS NULL OR auth_level < 1
    `).run();
}

CREATE DATABASE IF NOT EXISTS sf_desktop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sf_desktop;

CREATE TABLE IF NOT EXISTS user_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  can_read TINYINT(1) NOT NULL DEFAULT 1,
  can_edit TINYINT(1) NOT NULL DEFAULT 0,
  can_create TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  can_manage_groups TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id VARCHAR(80) NOT NULL UNIQUE,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  image_url TEXT NULL,
  rank_name VARCHAR(120) NULL,
  group_id INT NOT NULL,
  notes TEXT NULL,
  login_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_group FOREIGN KEY (group_id) REFERENCES user_groups(id)
);

-- Seed-Daten: Gruppen anlegen
INSERT INTO user_groups (name, can_read, can_edit, can_create, can_delete, can_manage_groups)
VALUES
  ('Superadmin', 1, 1, 1, 1, 1),
  ('Admin',      1, 1, 1, 1, 0),
  ('User',       1, 0, 0, 0, 0)
ON DUPLICATE KEY UPDATE
  can_read          = VALUES(can_read),
  can_edit          = VALUES(can_edit),
  can_create        = VALUES(can_create),
  can_delete        = VALUES(can_delete),
  can_manage_groups = VALUES(can_manage_groups);

-- Seed-Daten: Standardbenutzer A-1001 als Superadmin
-- Passwort-Hash entspricht "1234" (bcrypt, 10 Runden)
INSERT INTO staff (staff_id, first_name, last_name, password_hash, rank_name, group_id, login_enabled)
SELECT 'A-1001', 'Admin', 'User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Superadmin', g.id, 1
FROM user_groups g WHERE g.name = 'Superadmin'
ON DUPLICATE KEY UPDATE
  group_id = (SELECT id FROM user_groups WHERE name = 'Superadmin');

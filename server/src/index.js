import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { initDatabase, query } from './db.js';
import { authRequired, createToken, mapUser, requireGroupNames, requireRight } from './auth.js';

const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: false }));
app.use(express.json());

const allowedStatusLabels = ['Abgeschlossen', 'In Bearbeitung', 'Nicht Begonnen'];

function normalizeStrafaktePayload(body = {}) {
  return {
    personName: String(body.personName || '').trim(),
    personId: String(body.personId || '').trim(),
    unitName: String(body.unitName || '').trim(),
    serviceRank: String(body.serviceRank || '').trim(),
    crime: String(body.crime || '').trim(),
    punishment: String(body.punishment || '').trim(),
    penaltyLevel: String(body.penaltyLevel || '').trim(),
    statusLabel: allowedStatusLabels.includes(body.statusLabel) ? body.statusLabel : 'Nicht Begonnen',
    imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null,
    notes: body.notes ? String(body.notes).trim() : null,
  };
}

async function logStrafakteChange({ strafakteId = null, actionType, user, changesText = null }) {
  await query(
    `INSERT INTO strafakten_logs (strafakte_id, action_type, actor_staff_pk, actor_staff_id, actor_name, changes_text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [strafakteId, actionType, user.id, user.staffId, `${user.firstName} ${user.lastName}`, changesText]
  );
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { firstName, lastName, password } = req.body || {};
  if (!firstName || !lastName || !password) {
    return res.status(400).json({ message: 'Vor- und Nachname sowie Passwort sind erforderlich.' });
  }

  const rows = await query(
    `SELECT s.id, s.staff_id, s.first_name, s.last_name, s.password_hash, s.image_url, s.rank_name, s.notes, s.login_enabled,
            s.auth_level AS staff_auth_level,
            g.id AS group_id, g.name AS group_name, g.auth_level AS group_auth_level,
            g.can_read, g.can_edit, g.can_create, g.can_delete, g.can_manage_groups
     FROM staff s
     JOIN user_groups g ON g.id = s.group_id
     WHERE s.first_name = ? AND s.last_name = ? AND s.login_enabled = 1`,
    [firstName, lastName]
  );

  if (!rows.length) return res.status(401).json({ message: 'Benutzer nicht gefunden oder deaktiviert.' });
  const row = rows[0];
  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) return res.status(401).json({ message: 'Passwort ist falsch.' });

  const user = mapUser(row);
  const token = createToken(user);
  res.json({ token, user });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/groups', authRequired, requireRight('canRead'), async (_req, res) => {
  const rows = await query(
    `SELECT id, name, auth_level AS authLevel, can_read AS canRead, can_edit AS canEdit, can_create AS canCreate,
            can_delete AS canDelete, can_manage_groups AS canManageGroups
     FROM user_groups ORDER BY name`
  );
  res.json(rows);
});

app.get('/api/units', authRequired, requireRight('canRead'), async (_req, res) => {
  const rows = await query('SELECT id, name FROM units ORDER BY name ASC');
  res.json(rows);
});

app.get('/api/auth-levels', authRequired, requireRight('canRead'), async (_req, res) => {
  const rows = await query('SELECT id, name, level FROM authorization_levels ORDER BY level ASC, name ASC');
  res.json(rows);
});

app.post('/api/auth-levels', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const { name, level } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Name der Autorisierungsstufe fehlt.' });
  }
  const parsedLevel = Number(level || 0);
  if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
    return res.status(400).json({ message: 'Level muss eine ganze Zahl >= 1 sein.' });
  }
  await query('INSERT INTO authorization_levels (name, level) VALUES (?, ?)', [String(name).trim(), parsedLevel]);
  res.status(201).json({ ok: true });
});

app.put('/api/auth-levels/:id', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const { name, level } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Name der Autorisierungsstufe fehlt.' });
  }
  const parsedLevel = Number(level || 0);
  if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
    return res.status(400).json({ message: 'Level muss eine ganze Zahl >= 1 sein.' });
  }

  const currentRows = await query('SELECT level FROM authorization_levels WHERE id = ?', [req.params.id]);
  if (!currentRows.length) {
    return res.status(404).json({ message: 'Autorisierungsstufe nicht gefunden.' });
  }

  const oldLevel = Number(currentRows[0].level);
  await query('UPDATE authorization_levels SET name = ?, level = ? WHERE id = ?', [String(name).trim(), parsedLevel, req.params.id]);

  if (oldLevel !== parsedLevel) {
    await query('UPDATE user_groups SET auth_level = ? WHERE auth_level = ?', [parsedLevel, oldLevel]);
    await query('UPDATE staff SET auth_level = ? WHERE auth_level = ?', [parsedLevel, oldLevel]);
    await query('UPDATE strafakten SET auth_level = ? WHERE auth_level = ?', [parsedLevel, oldLevel]);
  }

  res.json({ ok: true });
});

app.delete('/api/auth-levels/:id', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const rows = await query('SELECT level FROM authorization_levels WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Autorisierungsstufe nicht gefunden.' });

  const level = Number(rows[0].level);
  const g = await query('SELECT COUNT(*) AS count FROM user_groups WHERE auth_level = ?', [level]);
  const s = await query('SELECT COUNT(*) AS count FROM staff WHERE auth_level = ?', [level]);
  const c = await query('SELECT COUNT(*) AS count FROM strafakten WHERE auth_level = ?', [level]);
  if (g[0].count || s[0].count || c[0].count) {
    return res.status(400).json({ message: 'Autorisierungsstufe wird noch verwendet.' });
  }

  await query('DELETE FROM authorization_levels WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/units', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Einheitsname fehlt.' });
  }
  await query('INSERT INTO units (name) VALUES (?)', [String(name).trim()]);
  res.status(201).json({ ok: true });
});

app.put('/api/units/:id', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Einheitsname fehlt.' });
  }
  await query('UPDATE units SET name = ? WHERE id = ?', [String(name).trim(), req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/units/:id', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const usedByStaff = await query('SELECT COUNT(*) AS count FROM staff WHERE unit_id = ?', [req.params.id]);
  const usedByCases = await query('SELECT COUNT(*) AS count FROM strafakten WHERE unit_id = ?', [req.params.id]);
  if (usedByStaff[0].count || usedByCases[0].count) {
    return res.status(400).json({ message: 'Einheit ist noch in Benutzung.' });
  }
  await query('DELETE FROM units WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/groups', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const { name, authLevel } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Gruppenname fehlt.' });

  await query(
    `INSERT INTO user_groups (name, auth_level, can_read, can_edit, can_create, can_delete, can_manage_groups)
     VALUES (?, ?, 1, 0, 0, 0, 0)`,
    [name, Math.max(1, Number(authLevel || 1))]
  );
  res.status(201).json({ ok: true });
});

app.put('/api/groups/:id', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const { name, canRead, canEdit, canCreate, canDelete, canManageGroups, authLevel } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Gruppenname fehlt.' });
  }
  await query(
    `UPDATE user_groups
     SET name = ?, can_read = ?, can_edit = ?, can_create = ?, can_delete = ?, can_manage_groups = ?, auth_level = ?
     WHERE id = ?`,
    [
      String(name).trim(),
      Number(!!canRead),
      Number(!!canEdit),
      Number(!!canCreate),
      Number(!!canDelete),
      Number(!!canManageGroups),
      Math.max(1, Number(authLevel || 1)),
      req.params.id,
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/groups/:id', authRequired, requireRight('canManageGroups'), async (req, res) => {
  const used = await query('SELECT COUNT(*) AS count FROM staff WHERE group_id = ?', [req.params.id]);
  if (used[0].count) {
    return res.status(400).json({ message: 'Gruppe ist noch Benutzern zugewiesen.' });
  }
  await query('DELETE FROM user_groups WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/staff', authRequired, requireRight('canRead'), async (_req, res) => {
  const rows = await query(
    `SELECT s.id, s.staff_id AS staffId, s.first_name AS firstName, s.last_name AS lastName,
            s.image_url AS imageUrl, s.rank_name AS rank, s.auth_level AS authLevel,
            s.unit_id AS unitId, u.name AS unitName,
            g.id AS groupId, g.name AS permission,
            s.notes, s.login_enabled AS canLogin
     FROM staff s
     LEFT JOIN units u ON u.id = s.unit_id
     JOIN user_groups g ON g.id = s.group_id
     ORDER BY s.first_name, s.last_name`
  );
  res.json(rows.map((row) => ({ ...row, canLogin: !!row.canLogin })));
});

app.post('/api/staff', authRequired, requireRight('canCreate'), async (req, res) => {
  const { firstName, lastName, staffId, password, imageUrl, rank, groupId, unitId, authLevel, notes, canLogin } = req.body || {};
  if (!firstName || !lastName || !staffId || !password || !groupId || !unitId) {
    return res.status(400).json({ message: 'Pflichtfelder fehlen.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO staff (staff_id, first_name, last_name, password_hash, image_url, rank_name, unit_id, auth_level, group_id, notes, login_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      staffId,
      firstName,
      lastName,
      passwordHash,
      imageUrl || null,
      rank || null,
      unitId,
      Math.max(1, Number(authLevel || 1)),
      groupId,
      notes || null,
      Number(!!canLogin),
    ]
  );
  res.status(201).json({ ok: true });
});

app.put('/api/staff/:id', authRequired, requireRight('canEdit'), async (req, res) => {
  const { firstName, lastName, staffId, password, imageUrl, rank, groupId, unitId, authLevel, notes, canLogin } = req.body || {};
  if (!firstName || !lastName || !staffId || !groupId || !unitId) {
    return res.status(400).json({ message: 'Pflichtfelder fehlen.' });
  }

  const currentRows = await query('SELECT * FROM staff WHERE id = ?', [req.params.id]);
  if (!currentRows.length) return res.status(404).json({ message: 'Eintrag nicht gefunden.' });

  let resolvedGroupId = currentRows[0].group_id;
  if (req.user.permissions.canManageGroups) {
    resolvedGroupId = groupId;
  }

  let passwordHash = currentRows[0].password_hash;
  if (password) passwordHash = await bcrypt.hash(password, 10);

  await query(
    `UPDATE staff
     SET staff_id = ?, first_name = ?, last_name = ?, password_hash = ?, image_url = ?, rank_name = ?, unit_id = ?, auth_level = ?, group_id = ?, notes = ?, login_enabled = ?
     WHERE id = ?`,
    [
      staffId,
      firstName,
      lastName,
      passwordHash,
      imageUrl || null,
      rank || null,
      unitId,
      Math.max(1, Number(authLevel || 1)),
      resolvedGroupId,
      notes || null,
      Number(!!canLogin),
      req.params.id,
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/staff/:id', authRequired, requireRight('canDelete'), async (req, res) => {
  await query('DELETE FROM staff WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/strafakten', authRequired, requireRight('canRead'), async (req, res) => {
  const { unit = '', rank = '', status = '', sortBy = 'unit', order = 'asc' } = req.query;
  const where = [];
  const params = [];

  if (unit) {
    where.push('sa.unit_name LIKE ?');
    params.push(`%${unit}%`);
  }
  if (rank) {
    where.push('sa.service_rank LIKE ?');
    params.push(`%${rank}%`);
  }
  if (status && allowedStatusLabels.includes(status)) {
    where.push('sa.status_label = ?');
    params.push(status);
  }

  const orderBy = sortBy === 'rank' ? 'sa.service_rank' : 'sa.unit_name';
  const orderDir = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await query(
    `SELECT sa.id, sa.person_name AS personName, sa.person_id AS personId, sa.unit_name AS unitName,
            sa.unit_id AS unitId,
            sa.service_rank AS serviceRank, sa.crime, sa.punishment, sa.penalty_level AS penaltyLevel,
            sa.auth_level AS authLevel,
            sa.status_label AS statusLabel, sa.image_url AS imageUrl, sa.notes,
            sa.created_by AS createdBy, sa.updated_by AS updatedBy,
            sa.created_at AS createdAt, sa.updated_at AS updatedAt,
            creator.first_name || ' ' || creator.last_name AS createdByName,
            updater.first_name || ' ' || updater.last_name AS updatedByName
     FROM strafakten sa
     JOIN staff creator ON creator.id = sa.created_by
     JOIN staff updater ON updater.id = sa.updated_by
     ${whereSql ? `${whereSql} AND` : 'WHERE'} sa.auth_level <= ?
     ORDER BY ${orderBy} ${orderDir}, sa.created_at DESC`,
    [...params, req.user.authLevel]
  );

  res.json(rows);
});

app.post('/api/strafakten', authRequired, async (req, res) => {
  const payload = normalizeStrafaktePayload(req.body);
  const requestedAuthLevel = Math.max(1, Number(req.body?.authLevel || 1));
  const unitId = Number(req.body?.unitId || 0);
  if (!payload.personName || !payload.personId || !unitId || !payload.serviceRank || !payload.crime || !payload.punishment || !payload.penaltyLevel) {
    return res.status(400).json({ message: 'Pflichtfelder fehlen.' });
  }

  const unitRows = await query('SELECT id, name FROM units WHERE id = ?', [unitId]);
  if (!unitRows.length) return res.status(400).json({ message: 'Einheit ungültig.' });

  const finalAuthLevel = Math.min(requestedAuthLevel, req.user.authLevel);

  await query(
    `INSERT INTO strafakten (person_name, person_id, unit_name, unit_id, service_rank, crime, punishment, penalty_level, auth_level, status_label, image_url, notes, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.personName,
      payload.personId,
      unitRows[0].name,
      unitId,
      payload.serviceRank,
      payload.crime,
      payload.punishment,
      payload.penaltyLevel,
      finalAuthLevel,
      payload.statusLabel,
      payload.imageUrl,
      payload.notes,
      req.user.id,
      req.user.id,
    ]
  );

  const inserted = await query('SELECT last_insert_rowid() AS id');
  await logStrafakteChange({
    strafakteId: inserted[0].id,
    actionType: 'created',
    user: req.user,
    changesText: `Neu angelegt: ${payload.personName} (${payload.personId})`,
  });

  res.status(201).json({ ok: true });
});

app.put('/api/strafakten/:id', authRequired, async (req, res) => {
  const existingRows = await query('SELECT * FROM strafakten WHERE id = ?', [req.params.id]);
  if (!existingRows.length) return res.status(404).json({ message: 'Strafakte nicht gefunden.' });
  if (Number(existingRows[0].auth_level || 1) > req.user.authLevel) {
    return res.status(403).json({ message: 'Autorisierungsstufe zu niedrig.' });
  }

  const payload = normalizeStrafaktePayload(req.body);
  const requestedAuthLevel = Math.max(1, Number(req.body?.authLevel || existingRows[0].auth_level || 1));
  const unitId = Number(req.body?.unitId || existingRows[0].unit_id || 0);

  if (!payload.personName || !payload.personId || !unitId || !payload.serviceRank || !payload.crime || !payload.punishment || !payload.penaltyLevel) {
    return res.status(400).json({ message: 'Pflichtfelder fehlen.' });
  }

  const unitRows = await query('SELECT id, name FROM units WHERE id = ?', [unitId]);
  if (!unitRows.length) return res.status(400).json({ message: 'Einheit ungültig.' });

  const finalAuthLevel = Math.min(requestedAuthLevel, req.user.authLevel);

  await query(
    `UPDATE strafakten
     SET person_name = ?, person_id = ?, unit_name = ?, service_rank = ?, crime = ?, punishment = ?, penalty_level = ?,
         unit_id = ?, auth_level = ?, status_label = ?, image_url = ?, notes = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      payload.personName,
      payload.personId,
      unitRows[0].name,
      payload.serviceRank,
      payload.crime,
      payload.punishment,
      payload.penaltyLevel,
      unitId,
      finalAuthLevel,
      payload.statusLabel,
      payload.imageUrl,
      payload.notes,
      req.user.id,
      req.params.id,
    ]
  );

  await logStrafakteChange({
    strafakteId: Number(req.params.id),
    actionType: 'updated',
    user: req.user,
    changesText: `Bearbeitet: ${payload.personName} (${payload.personId})`,
  });

  res.json({ ok: true });
});

app.delete('/api/strafakten/:id', authRequired, requireRight('canDelete'), async (req, res) => {
  const existingRows = await query('SELECT person_name AS personName, person_id AS personId, auth_level AS authLevel FROM strafakten WHERE id = ?', [req.params.id]);
  if (!existingRows.length) return res.status(404).json({ message: 'Strafakte nicht gefunden.' });
  if (Number(existingRows[0].authLevel || 1) > req.user.authLevel) {
    return res.status(403).json({ message: 'Autorisierungsstufe zu niedrig.' });
  }

  await query('DELETE FROM strafakten WHERE id = ?', [req.params.id]);

  await logStrafakteChange({
    strafakteId: Number(req.params.id),
    actionType: 'deleted',
    user: req.user,
    changesText: `Gelöscht: ${existingRows[0].personName} (${existingRows[0].personId})`,
  });

  res.json({ ok: true });
});

app.get('/api/strafakten/logs', authRequired, requireRight('canRead'), async (_req, res) => {
  const rows = await query(
    `SELECT sl.id, sl.strafakte_id AS strafakteId, sl.action_type AS actionType,
            sl.actor_staff_id AS actorStaffId, sl.actor_name AS actorName,
            sl.changes_text AS changesText, sl.created_at AS createdAt
     FROM strafakten_logs sl
     ORDER BY sl.created_at DESC, sl.id DESC
     LIMIT 200`
  );
  res.json(rows);
});

app.get('/api/strafakten/stats', authRequired, requireGroupNames(['Admin', 'Superadmin']), async (_req, res) => {
  const perUser = await query(
    `SELECT sl.actor_staff_id AS staffId, sl.actor_name AS name,
            SUM(CASE WHEN sl.action_type = 'created' THEN 1 ELSE 0 END) AS createdCount,
            SUM(CASE WHEN sl.action_type = 'updated' THEN 1 ELSE 0 END) AS updatedCount,
            SUM(CASE WHEN sl.action_type = 'deleted' THEN 1 ELSE 0 END) AS deletedCount,
            COUNT(*) AS totalActions
     FROM strafakten_logs sl
     GROUP BY sl.actor_staff_id, sl.actor_name
     ORDER BY totalActions DESC, sl.actor_name ASC`
  );

  const totals = await query(
    `SELECT
        COUNT(*) AS totalCases,
        SUM(CASE WHEN status_label = 'Abgeschlossen' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status_label = 'In Bearbeitung' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status_label = 'Nicht Begonnen' THEN 1 ELSE 0 END) AS notStarted
     FROM strafakten`
  );

  const byUnit = await query(
    `SELECT unit_name AS unitName, COUNT(*) AS count
     FROM strafakten
     GROUP BY unit_name
     ORDER BY count DESC, unit_name ASC`
  );

  const byRank = await query(
    `SELECT service_rank AS serviceRank, COUNT(*) AS count
     FROM strafakten
     GROUP BY service_rank
     ORDER BY count DESC, service_rank ASC`
  );

  res.json({
    totals: totals[0] || { totalCases: 0, completed: 0, inProgress: 0, notStarted: 0 },
    perUser,
    byUnit,
    byRank,
  });
});

initDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Server läuft auf Port ${config.port}`);
    });
  })
  .catch((error) => {
    console.error('Serverstart fehlgeschlagen:', error);
    process.exit(1);
  });

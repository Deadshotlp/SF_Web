import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

export function createToken(user) {
  return jwt.sign(
    {
      staffId: user.staffId,
      groupName: user.groupName,
    },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
}

export async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Nicht angemeldet.' });

    const payload = jwt.verify(token, config.jwtSecret);
    const rows = await query(
      `SELECT s.id, s.staff_id, s.first_name, s.last_name, s.image_url, s.rank_name, s.notes, s.login_enabled,
              s.auth_level AS staff_auth_level,
              g.id AS group_id, g.name AS group_name, g.auth_level AS group_auth_level,
              g.can_read, g.can_edit, g.can_create, g.can_delete, g.can_manage_groups
       FROM staff s
       JOIN user_groups g ON g.id = s.group_id
       WHERE s.staff_id = ? AND s.login_enabled = 1`,
      [payload.staffId]
    );

    if (!rows.length) return res.status(401).json({ message: 'Sitzung ungültig.' });

    const row = rows[0];
    req.user = mapUser(row);
    next();
  } catch (_error) {
    return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen.' });
  }
}

export function requireRight(rightName) {
  return (req, res, next) => {
    if (!req.user?.permissions?.[rightName]) {
      return res.status(403).json({ message: 'Keine Berechtigung.' });
    }
    next();
  };
}

export function requireGroupNames(groupNames) {
  return (req, res, next) => {
    if (!groupNames.includes(req.user?.groupName)) {
      return res.status(403).json({ message: 'Nur Admins und Superadmins haben Zugriff.' });
    }
    next();
  };
}

export function mapUser(row) {
  const staffAuthLevel = Number(row.staff_auth_level ?? row.auth_level ?? 1);
  const groupAuthLevel = Number(row.group_auth_level ?? row.auth_level ?? 1);
  return {
    id: row.id,
    staffId: row.staff_id,
    firstName: row.first_name,
    lastName: row.last_name,
    imageUrl: row.image_url,
    rank: row.rank_name,
    notes: row.notes,
    groupId: row.group_id,
    groupName: row.group_name,
    staffAuthLevel,
    groupAuthLevel,
    authLevel: Math.max(staffAuthLevel, groupAuthLevel),
    permissions: {
      canRead: !!row.can_read,
      canEdit: !!row.can_edit,
      canCreate: !!row.can_create,
      canDelete: !!row.can_delete,
      canManageGroups: !!row.can_manage_groups,
    },
  };
}

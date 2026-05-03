const { query } = require('../config/db');
const { buildUpdateSet } = require('../utils/sql');

const publicUserSelect = `
  u.user_id,
  u.role,
  u.email,
  u.display_name,
  u.phone,
  u.is_active,
  u.created_at,
  r.receiver_id,
  r.wallet_balance,
  p.provider_id,
  m.manager_id
`;

async function findByEmail(email) {
  const rows = await query(`
    SELECT
      ${publicUserSelect},
      u.password_hash
    FROM Users u
    LEFT JOIN Receivers r ON u.user_id = r.user_id
    LEFT JOIN Providers p ON u.user_id = p.user_id
    LEFT JOIN Managers m ON u.user_id = m.user_id
    WHERE u.email = ?
  `, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const rows = await query(`
    SELECT ${publicUserSelect}
    FROM Users u
    LEFT JOIN Receivers r ON u.user_id = r.user_id
    LEFT JOIN Providers p ON u.user_id = p.user_id
    LEFT JOIN Managers m ON u.user_id = m.user_id
    WHERE u.user_id = ?
  `, [id]);
  return rows[0] || null;
}

async function list({ role = '', search = '' } = {}) {
  const where = [];
  const params = [];
  if (role) {
    where.push('u.role = ?');
    params.push(role);
  }
  if (search) {
    where.push('CONCAT_WS(" ", u.email, u.display_name, u.phone, u.role) LIKE ?');
    params.push(`%${search}%`);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return query(`
    SELECT ${publicUserSelect}
    FROM Users u
    LEFT JOIN Receivers r ON u.user_id = r.user_id
    LEFT JOIN Providers p ON u.user_id = p.user_id
    LEFT JOIN Managers m ON u.user_id = m.user_id
    ${whereClause}
    ORDER BY u.user_id DESC
  `, params);
}

async function createUser(user, executor) {
  const [result] = await executor.execute(`
    INSERT INTO Users (role, email, password_hash, display_name, phone, is_active)
    VALUES (?, ?, ?, ?, ?, TRUE)
  `, [
    user.role,
    user.email,
    user.password_hash,
    user.display_name,
    user.phone || null
  ]);
  return result.insertId;
}

async function createReceiver(userId, payload, executor) {
  const [result] = await executor.execute(`
    INSERT INTO Receivers (user_id, language)
    VALUES (?, ?)
  `, [userId, payload.language || null]);
  return result.insertId;
}

async function createProvider(userId, payload, executor) {
  const [result] = await executor.execute(`
    INSERT INTO Providers (user_id, provider_status, biography)
    VALUES (?, ?, ?)
  `, [userId, payload.provider_status || 'active', payload.biography || null]);
  return result.insertId;
}

async function createManager(userId, payload, executor) {
  const [result] = await executor.execute(`
    INSERT INTO Managers (user_id, department)
    VALUES (?, ?)
  `, [userId, payload.department || null]);
  return result.insertId;
}

async function update(id, payload) {
  const { setClause, values } = buildUpdateSet(payload, ['display_name', 'phone', 'is_active']);
  const result = await query(`UPDATE Users SET ${setClause} WHERE user_id = ?`, [...values, id]);
  return result.affectedRows;
}

module.exports = {
  findByEmail,
  findById,
  list,
  createUser,
  createReceiver,
  createProvider,
  createManager,
  update
};

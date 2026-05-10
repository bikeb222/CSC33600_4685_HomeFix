const { query } = require('../config/db');
const { buildUpdateSet } = require('../utils/sql');

async function run(executor, sql, params = []) {
  if (executor) {
    const [rows] = await executor.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

const roleTables = {
  receiver: {
    table: 'Receivers',
    idColumn: 'receiver_id',
    extraColumns: 'language, wallet_balance'
  },
  provider: {
    table: 'Providers',
    idColumn: 'provider_id',
    extraColumns: 'provider_status, biography'
  },
  manager: {
    table: 'Managers',
    idColumn: 'manager_id',
    extraColumns: 'department'
  }
};

function userId(role, id) {
  return `${role}:${id}`;
}

function parseUserId(id) {
  const [role, rawId] = String(id || '').split(':');
  const config = roleTables[role];
  const roleId = Number(rawId);
  if (!config || !Number.isInteger(roleId) || roleId <= 0) {
    return null;
  }
  return { role, roleId, ...config };
}

function commonSelect(role, includePassword = false) {
  const config = roleTables[role];
  return `
    SELECT
      CONCAT('${role}:', ${config.idColumn}) AS user_id,
      '${role}' AS role,
      email,
      display_name,
      display_name AS username,
      phone,
      is_active,
      created_at,
      ${role === 'receiver' ? 'receiver_id' : 'NULL'} AS receiver_id,
      ${role === 'receiver' ? 'wallet_balance' : 'NULL'} AS wallet_balance,
      ${role === 'provider' ? 'provider_id' : 'NULL'} AS provider_id,
      ${role === 'manager' ? 'manager_id' : 'NULL'} AS manager_id
      ${includePassword ? ', password_hash' : ''}
    FROM ${config.table}
  `;
}

async function findByEmail(email, role = '') {
  if (role && roleTables[role]) {
    const rows = await query(`
      ${commonSelect(role, true)}
      WHERE email = ?
      LIMIT 1
    `, [email]);
    return rows[0] || null;
  }

  const rows = await query(`
    ${commonSelect('receiver', true)}
    WHERE email = ?
    UNION ALL
    ${commonSelect('provider', true)}
    WHERE email = ?
    UNION ALL
    ${commonSelect('manager', true)}
    WHERE email = ?
    LIMIT 1
  `, [email, email, email]);
  return rows[0] || null;
}

async function findById(id) {
  const parsed = parseUserId(id);
  if (!parsed) {
    return null;
  }
  const rows = await query(`
    ${commonSelect(parsed.role)}
    WHERE ${parsed.idColumn} = ?
  `, [parsed.roleId]);
  return rows[0] || null;
}

async function list({ role = '', search = '' } = {}) {
  const roles = role ? [role] : Object.keys(roleTables);
  const queries = [];
  const params = [];

  roles.forEach((currentRole) => {
    const config = roleTables[currentRole];
    if (!config) {
      return;
    }
    let sql = commonSelect(currentRole);
    const where = [];
    if (search) {
      where.push(`CONCAT_WS(" ", email, display_name, phone, '${currentRole}') LIKE ?`);
      params.push(`%${search}%`);
    }
    if (where.length) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }
    queries.push(sql);
  });

  if (!queries.length) {
    return [];
  }

  return query(`
    SELECT *
    FROM (
      ${queries.join('\nUNION ALL\n')}
    ) role_users
    ORDER BY role, user_id
  `, params);
}

async function createReceiver(user, payload, executor) {
  const [result] = await executor.execute(`
    INSERT INTO Receivers (email, password_hash, display_name, phone, is_active, language)
    VALUES (?, ?, ?, ?, TRUE, ?)
  `, [user.email, user.password_hash, user.display_name, user.phone || null, payload.language || null]);
  return result.insertId;
}

async function createProvider(user, payload, executor) {
  const [result] = await executor.execute(`
    INSERT INTO Providers (email, password_hash, display_name, phone, is_active, provider_status, biography)
    VALUES (?, ?, ?, ?, TRUE, ?, ?)
  `, [
    user.email,
    user.password_hash,
    user.display_name,
    user.phone || null,
    payload.provider_status || 'active',
    payload.biography || null
  ]);
  return result.insertId;
}

async function createManager(user, payload, executor) {
  const [result] = await executor.execute(`
    INSERT INTO Managers (email, password_hash, display_name, phone, is_active, department)
    VALUES (?, ?, ?, ?, TRUE, ?)
  `, [user.email, user.password_hash, user.display_name, user.phone || null, payload.department || null]);
  return result.insertId;
}

async function update(id, payload, executor = null) {
  const parsed = parseUserId(id);
  if (!parsed) {
    return 0;
  }
  const { setClause, values } = buildUpdateSet(payload, ['display_name', 'phone', 'is_active']);
  const result = await run(executor, `UPDATE ${parsed.table} SET ${setClause} WHERE ${parsed.idColumn} = ?`, [...values, parsed.roleId]);
  return result.affectedRows;
}

module.exports = {
  findByEmail,
  findById,
  list,
  createReceiver,
  createProvider,
  createManager,
  update,
  userId
};

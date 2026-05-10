const { query } = require('../config/db');
const { buildUpdateSet } = require('../utils/sql');

const PLATFORM_FEE_RATE = 0.15;

async function run(executor, sql, params = []) {
  if (executor) {
    const [rows] = await executor.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

const providerColumns = `
  p.provider_id,
  CONCAT('provider:', p.provider_id) AS user_id,
  p.display_name AS username,
  p.display_name,
  p.email,
  p.phone,
  p.is_active,
  p.provider_status,
  p.biography,
  p.created_at
`;

function rateColumns(viewerRole = 'manager') {
  const receiverRateExpression = `ROUND(ps.base_hourly_rate * ${1 + PLATFORM_FEE_RATE}, 2)`;
  if (viewerRole === 'provider') {
    return `
      ps.base_hourly_rate,
      ps.base_hourly_rate AS provider_base_hourly_rate,
      NULL AS receiver_base_hourly_rate
    `;
  }
  if (viewerRole === 'receiver') {
    return `
      ${receiverRateExpression} AS base_hourly_rate,
      NULL AS provider_base_hourly_rate,
      ${receiverRateExpression} AS receiver_base_hourly_rate
    `;
  }
  return `
    ps.base_hourly_rate,
    ps.base_hourly_rate AS provider_base_hourly_rate,
    ${receiverRateExpression} AS receiver_base_hourly_rate
  `;
}

async function list({ search = '', serviceId = null, activeOnly = false, viewerRole = 'manager' } = {}) {
  const params = [];
  const where = [];

  if (activeOnly) {
    where.push("p.provider_status = 'active'");
    where.push('p.is_active = TRUE');
  }

  if (serviceId) {
    where.push('ps.service_id = ?');
    where.push("ps.approval_status = 'approved'");
    params.push(serviceId);
  }

  if (search) {
    where.push('CONCAT_WS(" ", p.display_name, p.email, p.phone, p.provider_status, p.biography, s.service_name) LIKE ?');
    params.push(`%${search}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  if (serviceId) {
    return query(`
      SELECT
        ${providerColumns},
        ps.service_id,
        s.service_name,
        ${rateColumns(viewerRole)},
        ps.approval_status
      FROM Providers p
      JOIN Provider_Services ps ON p.provider_id = ps.provider_id
      JOIN Services s ON ps.service_id = s.service_id
      ${whereClause}
      ORDER BY p.display_name
    `, params);
  }

  return query(`
    SELECT
      ${providerColumns},
      COUNT(DISTINCT CASE WHEN ps.approval_status = 'approved' THEN ps.service_id END) AS service_count,
      COUNT(DISTINCT a.app_id) AS appointment_count
    FROM Providers p
    LEFT JOIN Provider_Services ps ON p.provider_id = ps.provider_id
    LEFT JOIN Services s ON ps.service_id = s.service_id
    LEFT JOIN Appointments a ON p.provider_id = a.provider_id
    ${whereClause}
    GROUP BY p.provider_id, p.display_name, p.email, p.phone, p.is_active, p.provider_status, p.biography, p.created_at
    ORDER BY p.provider_id DESC
  `, params);
}

async function findById(id) {
  const rows = await query(`
    SELECT ${providerColumns}
    FROM Providers p
    WHERE p.provider_id = ?
  `, [id]);
  return rows[0] || null;
}

async function create(provider) {
  const result = await query(`
    INSERT INTO Providers (email, password_hash, display_name, phone, is_active, provider_status, biography)
    VALUES (?, ?, ?, ?, TRUE, ?, ?)
  `, [
    provider.email,
    provider.password_hash,
    provider.display_name,
    provider.phone || null,
    provider.provider_status || 'active',
    provider.biography || null
  ]);
  return result.insertId;
}

async function update(id, payload, executor = null) {
  const { setClause, values } = buildUpdateSet(payload, [
    'display_name',
    'phone',
    'is_active',
    'provider_status',
    'biography'
  ]);
  const result = await run(executor, `UPDATE Providers SET ${setClause} WHERE provider_id = ?`, [...values, id]);
  return result.affectedRows;
}

async function remove(id) {
  const result = await query('DELETE FROM Providers WHERE provider_id = ?', [id]);
  return result.affectedRows;
}

async function listServices(providerId, viewerRole = 'manager') {
  return query(`
    SELECT
      ps.provider_id,
      ps.service_id,
      s.service_name,
      s.description,
      ${rateColumns(viewerRole)},
      ps.approval_status,
      ps.requested_at,
      ps.reviewed_by,
      ps.reviewed_at
    FROM Provider_Services ps
    JOIN Services s ON ps.service_id = s.service_id
    WHERE ps.provider_id = ?
    ORDER BY s.service_name
  `, [providerId]);
}

async function addService(providerId, serviceId, baseHourlyRate, approvalStatus = 'pending', managerId = null) {
  await query(`
    INSERT INTO Provider_Services (provider_id, service_id, base_hourly_rate, approval_status, reviewed_by, reviewed_at)
    VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END)
    ON DUPLICATE KEY UPDATE
      base_hourly_rate = VALUES(base_hourly_rate),
      approval_status = VALUES(approval_status),
      reviewed_by = VALUES(reviewed_by),
      reviewed_at = VALUES(reviewed_at)
  `, [providerId, serviceId, baseHourlyRate, approvalStatus, managerId, approvalStatus]);
}

async function listServiceApprovals(status = '') {
  const params = [];
  let whereClause = '';
  if (status) {
    whereClause = 'WHERE ps.approval_status = ?';
    params.push(status);
  }
  return query(`
    SELECT
      ps.provider_id,
      p.display_name AS provider_name,
      ps.service_id,
      s.service_name,
      ps.base_hourly_rate,
      ps.approval_status,
      ps.requested_at,
      ps.reviewed_at,
      m.display_name AS reviewed_by_name
    FROM Provider_Services ps
    JOIN Providers p ON ps.provider_id = p.provider_id
    JOIN Services s ON ps.service_id = s.service_id
    LEFT JOIN Managers m ON ps.reviewed_by = m.manager_id
    ${whereClause}
    ORDER BY FIELD(ps.approval_status, 'pending', 'approved', 'rejected'), ps.requested_at DESC
  `, params);
}

async function reviewService(providerId, serviceId, status, managerId) {
  const result = await query(`
    UPDATE Provider_Services
    SET approval_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE provider_id = ? AND service_id = ?
  `, [status, managerId, providerId, serviceId]);
  return result.affectedRows;
}

async function listUnavailableBlocks(providerId) {
  return query(`
    SELECT
      block_id,
      provider_id,
      start_time,
      end_time,
      reason,
      created_at
    FROM Provider_Unavailable_Blocks
    WHERE provider_id = ?
    ORDER BY start_time
  `, [providerId]);
}

async function unavailableBlockHasOverlap(providerId, startTime, endTime, excludeBlockId = null) {
  const params = [providerId, endTime, startTime];
  let excludeClause = '';
  if (excludeBlockId) {
    excludeClause = 'AND block_id <> ?';
    params.push(excludeBlockId);
  }
  const rows = await query(`
    SELECT block_id
    FROM Provider_Unavailable_Blocks
    WHERE provider_id = ?
      AND start_time < ?
      AND end_time > ?
      ${excludeClause}
    LIMIT 1
  `, params);
  return rows[0] || null;
}

async function addUnavailableBlock(providerId, startTime, endTime, reason = null) {
  const result = await query(`
    INSERT INTO Provider_Unavailable_Blocks (provider_id, start_time, end_time, reason)
    VALUES (?, ?, ?, ?)
  `, [providerId, startTime, endTime, reason || null]);
  return result.insertId;
}

async function removeUnavailableBlock(providerId, blockId) {
  const result = await query(`
    DELETE FROM Provider_Unavailable_Blocks
    WHERE provider_id = ? AND block_id = ?
  `, [providerId, blockId]);
  return result.affectedRows;
}

async function removeService(providerId, serviceId) {
  const result = await query(`
    DELETE FROM Provider_Services
    WHERE provider_id = ? AND service_id = ?
  `, [providerId, serviceId]);
  return result.affectedRows;
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  listServices,
  addService,
  listServiceApprovals,
  reviewService,
  listUnavailableBlocks,
  unavailableBlockHasOverlap,
  addUnavailableBlock,
  removeUnavailableBlock,
  removeService
};

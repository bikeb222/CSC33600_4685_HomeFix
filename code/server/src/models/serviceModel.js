const { query } = require('../config/db');
const { buildUpdateSet } = require('../utils/sql');

async function list(search = '') {
  const params = [];
  let whereClause = '';
  if (search) {
    whereClause = 'WHERE CONCAT_WS(" ", s.service_name, s.description) LIKE ?';
    params.push(`%${search}%`);
  }

  return query(`
    SELECT
      s.service_id,
      s.service_name,
      s.description,
      COUNT(DISTINCT ps.provider_id) AS provider_count
    FROM Services s
    LEFT JOIN Provider_Services ps ON s.service_id = ps.service_id
    ${whereClause}
    GROUP BY s.service_id
    ORDER BY s.service_name
  `, params);
}

async function findById(id) {
  const rows = await query(`
    SELECT service_id, service_name, description
    FROM Services
    WHERE service_id = ?
  `, [id]);
  return rows[0] || null;
}

async function create(service) {
  const result = await query(`
    INSERT INTO Services (service_name, description)
    VALUES (?, ?)
  `, [service.service_name, service.description || null]);
  return result.insertId;
}

async function update(id, payload) {
  const { setClause, values } = buildUpdateSet(payload, ['service_name', 'description']);
  const result = await query(`UPDATE Services SET ${setClause} WHERE service_id = ?`, [...values, id]);
  return result.affectedRows;
}

async function remove(id) {
  const result = await query('DELETE FROM Services WHERE service_id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove
};

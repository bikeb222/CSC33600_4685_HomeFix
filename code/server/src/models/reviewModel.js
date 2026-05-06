const { query } = require('../config/db');

const reviewSelect = `
  SELECT
    rev.review_id,
    rev.app_id,
    rev.rating,
    rev.review_direction,
    rev.comment,
    rev.created_at,
    a.provider_id,
    p.display_name AS provider_name,
    a.receiver_id,
    r.display_name AS receiver_name,
    s.service_name,
    a.appointment_status
  FROM Reviews rev
  JOIN Appointments a ON rev.app_id = a.app_id
  JOIN Providers p ON a.provider_id = p.provider_id
  JOIN Receivers r ON a.receiver_id = r.receiver_id
  JOIN Services s ON a.service_id = s.service_id
`;

async function list(filters = {}) {
  const where = [];
  const params = [];

  if (filters.appointmentId) {
    where.push('rev.app_id = ?');
    params.push(filters.appointmentId);
  }
  if (filters.providerId) {
    where.push('a.provider_id = ?');
    params.push(filters.providerId);
  }
  if (filters.receiverId) {
    where.push('a.receiver_id = ?');
    params.push(filters.receiverId);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return query(`
    ${reviewSelect}
    ${whereClause}
    ORDER BY rev.created_at DESC, rev.review_id DESC
  `, params);
}

async function appointmentById(appId) {
  const rows = await query('SELECT app_id, receiver_id, provider_id, appointment_status FROM Appointments WHERE app_id = ?', [appId]);
  return rows[0] || null;
}

async function appointmentExists(appId) {
  return Boolean(await appointmentById(appId));
}

async function create(review) {
  const result = await query(`
    INSERT INTO Reviews (app_id, rating, review_direction, comment)
    VALUES (?, ?, ?, ?)
  `, [review.app_id, review.rating, review.review_direction, review.comment || null]);
  return result.insertId;
}

async function remove(id) {
  const result = await query('DELETE FROM Reviews WHERE review_id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  list,
  appointmentById,
  appointmentExists,
  create,
  remove
};

const { query } = require('../config/db');

const paymentSelect = `
  SELECT
    pay.payment_id,
    pay.app_id,
    pay.total_amount,
    pay.commission_rate,
    pay.commission_fee,
    pay.provider_payout,
    pay.payment_status,
    pay.payment_date,
    a.receiver_id,
    a.provider_id,
    a.appointment_status,
    a.estimated_hours,
    a.actual_hours,
    a.actual_total,
    r.display_name AS receiver_name,
    p.display_name AS provider_name,
    s.service_name,
    a.scheduled_time
  FROM Payments pay
  JOIN Appointments a ON pay.app_id = a.app_id
  JOIN Receivers r ON a.receiver_id = r.receiver_id
  JOIN Providers p ON a.provider_id = p.provider_id
  JOIN Services s ON a.service_id = s.service_id
`;

async function list(filters = {}) {
  const where = [];
  const params = [];

  if (filters.paymentId) {
    where.push('pay.payment_id = ?');
    params.push(filters.paymentId);
  }
  if (filters.appId) {
    where.push('pay.app_id = ?');
    params.push(filters.appId);
  }
  if (filters.receiverId) {
    where.push('a.receiver_id = ?');
    params.push(filters.receiverId);
  }
  if (filters.providerId) {
    where.push('a.provider_id = ?');
    params.push(filters.providerId);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return query(`
    ${paymentSelect}
    ${whereClause}
    ORDER BY pay.payment_id DESC
  `, params);
}

async function findById(id) {
  const rows = await list({ paymentId: id });
  return rows[0] || null;
}

async function findByAppId(appId) {
  const rows = await list({ appId });
  return rows[0] || null;
}

async function appointmentForPayment(appId) {
  const rows = await query(`
    SELECT app_id, receiver_id, provider_id, appointment_status, estimated_total, actual_hours, actual_total
    FROM Appointments
    WHERE app_id = ?
  `, [appId]);
  return rows[0] || null;
}

async function create(payment) {
  const result = await query(`
    INSERT INTO Payments (app_id, total_amount, commission_rate, payment_status, payment_date)
    VALUES (?, ?, ?, ?, CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END)
  `, [
    payment.app_id,
    payment.total_amount,
    payment.commission_rate,
    payment.payment_status,
    payment.payment_status
  ]);
  return result.insertId;
}

async function createWithProcedure(appId, commissionRate) {
  const resultSets = await query('CALL sp_create_payment_for_completed_appointment(?, ?)', [appId, commissionRate]);
  const paymentRow = Array.isArray(resultSets?.[0]) ? resultSets[0][0] : resultSets?.[0];
  return paymentRow?.payment_id;
}

async function updateStatus(id, status) {
  const result = await query(`
    UPDATE Payments
    SET
      payment_status = ?,
      payment_date = CASE
        WHEN ? = 'paid' THEN COALESCE(payment_date, CURRENT_TIMESTAMP)
        WHEN ? = 'unpaid' THEN NULL
        ELSE payment_date
      END
    WHERE payment_id = ?
  `, [status, status, status, id]);
  return result.affectedRows;
}

module.exports = {
  list,
  findById,
  findByAppId,
  appointmentForPayment,
  create,
  createWithProcedure,
  updateStatus
};

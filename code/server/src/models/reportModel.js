const { query } = require('../config/db');

async function appointmentsReport() {
  return query(`
    SELECT
      a.app_id,
      ru.display_name AS receiver,
      pu.display_name AS provider,
      s.service_name AS service,
      a.scheduled_time,
      a.appointment_status AS status,
      a.estimated_total
    FROM Appointments a
    JOIN Receivers r ON a.receiver_id = r.receiver_id
    JOIN Users ru ON r.user_id = ru.user_id
    JOIN Providers p ON a.provider_id = p.provider_id
    JOIN Users pu ON p.user_id = pu.user_id
    JOIN Services s ON a.service_id = s.service_id
    ORDER BY a.scheduled_time DESC
  `);
}

async function paymentsReport() {
  return query(`
    SELECT
      pay.payment_id,
      pay.app_id,
      pay.total_amount,
      pay.commission_fee,
      pay.provider_payout,
      pay.payment_status
    FROM Payments pay
    ORDER BY pay.payment_id DESC
  `);
}

async function providerPerformanceReport(filters = {}) {
  const params = [];
  let providerFilter = '';
  if (filters.providerId) {
    providerFilter = 'WHERE p.provider_id = ?';
    params.push(filters.providerId);
  }

  return query(`
    SELECT
      p.provider_id,
      u.display_name AS provider_name,
      COALESCE(completed.completed_appointments_count, 0) AS completed_appointments_count,
      COALESCE(ratings.average_rating, 0) AS average_rating,
      COALESCE(payouts.total_payout, 0) AS total_payout
    FROM Providers p
    JOIN Users u ON p.user_id = u.user_id
    LEFT JOIN (
      SELECT provider_id, COUNT(*) AS completed_appointments_count
      FROM Appointments
      WHERE appointment_status = 'completed'
      GROUP BY provider_id
    ) completed ON p.provider_id = completed.provider_id
    LEFT JOIN (
      SELECT a.provider_id, ROUND(AVG(rev.rating), 2) AS average_rating
      FROM Appointments a
      JOIN Reviews rev ON a.app_id = rev.app_id
      WHERE rev.review_direction = 'receiver_to_provider'
      GROUP BY a.provider_id
    ) ratings ON p.provider_id = ratings.provider_id
    LEFT JOIN (
      SELECT a.provider_id, SUM(pay.provider_payout) AS total_payout
      FROM Payments pay
      JOIN Appointments a ON pay.app_id = a.app_id
      WHERE pay.payment_status = 'paid'
      GROUP BY a.provider_id
    ) payouts ON p.provider_id = payouts.provider_id
    ${providerFilter}
    ORDER BY u.display_name
  `, params);
}

module.exports = {
  appointmentsReport,
  paymentsReport,
  providerPerformanceReport
};

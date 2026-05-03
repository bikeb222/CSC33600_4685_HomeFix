const { query } = require('../config/db');

async function stats(user = null) {
  if (user?.role === 'provider') {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM Appointments WHERE provider_id = ?) AS total_appointments,
        (SELECT COUNT(*) FROM Appointments WHERE provider_id = ? AND appointment_status = 'pending') AS pending_appointments,
        (SELECT COUNT(*) FROM Appointments WHERE provider_id = ? AND appointment_status = 'completed') AS completed_appointments,
        COALESCE((SELECT SUM(pay.provider_payout) FROM Payments pay JOIN Appointments a ON pay.app_id = a.app_id WHERE a.provider_id = ? AND pay.payment_status = 'paid'), 0) AS total_payout,
        COALESCE((SELECT ROUND(AVG(rev.rating), 2) FROM Reviews rev JOIN Appointments a ON rev.app_id = a.app_id WHERE a.provider_id = ? AND rev.review_direction = 'receiver_to_provider'), 0) AS average_rating,
        (SELECT COUNT(*) FROM Provider_Services WHERE provider_id = ?) AS total_services
    `, [user.provider_id, user.provider_id, user.provider_id, user.provider_id, user.provider_id, user.provider_id]);
    return rows[0];
  }

  if (user?.role === 'receiver') {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM Appointments WHERE receiver_id = ?) AS total_appointments,
        (SELECT COUNT(*) FROM Appointments WHERE receiver_id = ? AND appointment_status IN ('pending', 'accepted', 'in_progress')) AS upcoming_appointments,
        COALESCE((SELECT SUM(pay.total_amount) FROM Payments pay JOIN Appointments a ON pay.app_id = a.app_id WHERE a.receiver_id = ? AND pay.payment_status = 'unpaid'), 0) AS pending_payments,
        (SELECT COUNT(*) FROM Addresses WHERE receiver_id = ?) AS saved_addresses,
        (SELECT COUNT(*) FROM Reviews rev JOIN Appointments a ON rev.app_id = a.app_id WHERE a.receiver_id = ?) AS total_reviews
    `, [user.receiver_id, user.receiver_id, user.receiver_id, user.receiver_id, user.receiver_id]);
    return rows[0];
  }

  const rows = await query(`
    SELECT
      (SELECT COUNT(*) FROM Receivers) AS total_receivers,
      (SELECT COUNT(*) FROM Providers) AS total_providers,
      (SELECT COUNT(*) FROM Services) AS total_services,
      (SELECT COUNT(*) FROM Appointments) AS total_appointments,
      (SELECT COUNT(*) FROM Payments) AS total_payments,
      COALESCE((SELECT SUM(total_amount) FROM Payments WHERE payment_status = 'paid'), 0) AS total_revenue,
      (SELECT COUNT(*) FROM Appointments WHERE appointment_status = 'completed') AS completed_appointments,
      (SELECT COUNT(*) FROM Appointments WHERE appointment_status = 'pending') AS pending_appointments
  `);
  return rows[0];
}

module.exports = {
  stats
};

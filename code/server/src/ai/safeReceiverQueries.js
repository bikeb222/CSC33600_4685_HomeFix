const { query } = require('../config/db');

async function getReceiverNextAppointment(receiverId) {
  const rows = await query(`
    SELECT
      a.app_id,
      a.appointment_status,
      a.scheduled_time,
      a.estimated_hours,
      a.actual_hours,
      a.receiver_base_hourly_rate_at_booking,
      a.estimated_total,
      a.actual_total,
      s.service_name,
      p.display_name AS provider_name,
      CONCAT(ad.street, ', ', ad.city, ', ', COALESCE(ad.state, ''), ' ', COALESCE(ad.zip_code, '')) AS address_label
    FROM Appointments a
    JOIN Services s ON a.service_id = s.service_id
    JOIN Providers p ON a.provider_id = p.provider_id
        JOIN Addresses ad ON a.address_id = ad.address_id
    WHERE a.receiver_id = ?
      AND a.appointment_status IN ('pending', 'accepted', 'in_progress')
      AND a.scheduled_time >= CURRENT_TIMESTAMP
    ORDER BY a.scheduled_time ASC
    LIMIT 1
  `, [receiverId]);
  return rows[0] || null;
}

async function getReceiverAppointments(receiverId, status = null) {
  const params = [receiverId];
  let statusClause = '';
  if (status) {
    statusClause = 'AND a.appointment_status = ?';
    params.push(status);
  }
  return query(`
    SELECT
      a.app_id,
      a.appointment_status,
      a.scheduled_time,
      a.estimated_hours,
      a.actual_hours,
      a.estimated_total,
      a.actual_total,
      s.service_name,
      p.display_name AS provider_name
    FROM Appointments a
    JOIN Services s ON a.service_id = s.service_id
    JOIN Providers p ON a.provider_id = p.provider_id
        WHERE a.receiver_id = ?
      ${statusClause}
    ORDER BY a.scheduled_time DESC
    LIMIT 10
  `, params);
}

async function getReceiverPendingAppointments(receiverId) {
  return getReceiverAppointments(receiverId, 'pending');
}

async function getReceiverCompletedAppointments(receiverId) {
  return getReceiverAppointments(receiverId, 'completed');
}

async function getReceiverPayments(receiverId) {
  return query(`
    SELECT
      pay.payment_id,
      pay.app_id,
      pay.total_amount,
      pay.payment_status,
      pay.payment_date,
      s.service_name,
      p.display_name AS provider_name
    FROM Payments pay
    JOIN Appointments a ON pay.app_id = a.app_id
    JOIN Services s ON a.service_id = s.service_id
    JOIN Providers p ON a.provider_id = p.provider_id
        WHERE a.receiver_id = ?
    ORDER BY pay.payment_id DESC
    LIMIT 10
  `, [receiverId]);
}

async function getReceiverSpendingSummary(receiverId) {
  const summaryRows = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN pay.payment_status = 'paid' THEN pay.total_amount ELSE 0 END), 0) AS total_paid_amount,
      COALESCE(SUM(CASE WHEN pay.payment_status = 'unpaid' THEN pay.total_amount ELSE 0 END), 0) AS total_unpaid_amount,
      COUNT(CASE WHEN pay.payment_status = 'paid' THEN pay.payment_id END) AS paid_payment_count,
      COUNT(CASE WHEN pay.payment_status = 'unpaid' THEN pay.payment_id END) AS unpaid_payment_count,
      COALESCE(SUM(CASE WHEN a.appointment_status = 'completed' THEN a.actual_total ELSE 0 END), 0) AS completed_actual_total,
      COALESCE(SUM(CASE WHEN a.appointment_status IN ('pending', 'accepted', 'in_progress') THEN a.estimated_total ELSE 0 END), 0) AS active_estimated_total
    FROM Appointments a
    LEFT JOIN Payments pay ON a.app_id = pay.app_id
    WHERE a.receiver_id = ?
  `, [receiverId]);
  const recentPayments = await query(`
    SELECT
      pay.payment_id,
      pay.app_id,
      pay.total_amount,
      pay.payment_status,
      pay.payment_date,
      s.service_name,
      p.display_name AS provider_name
    FROM Payments pay
    JOIN Appointments a ON pay.app_id = a.app_id
    JOIN Services s ON a.service_id = s.service_id
    JOIN Providers p ON a.provider_id = p.provider_id
        WHERE a.receiver_id = ?
    ORDER BY pay.payment_date DESC, pay.payment_id DESC
    LIMIT 5
  `, [receiverId]);
  return {
    summary: summaryRows[0] || null,
    recent_payments: recentPayments,
    note: 'total_paid_amount is the amount this receiver has actually paid through Payments. active_estimated_total is not paid yet and may change after actual hours are set.'
  };
}

async function getReceiverUnpaidPayments(receiverId) {
  return query(`
    SELECT
      pay.payment_id,
      pay.app_id,
      pay.total_amount,
      pay.payment_status,
      s.service_name,
      p.display_name AS provider_name
    FROM Payments pay
    JOIN Appointments a ON pay.app_id = a.app_id
    JOIN Services s ON a.service_id = s.service_id
    JOIN Providers p ON a.provider_id = p.provider_id
        WHERE a.receiver_id = ? AND pay.payment_status = 'unpaid'
    ORDER BY pay.payment_id DESC
    LIMIT 10
  `, [receiverId]);
}

async function getReceiverAddresses(receiverId) {
  return query(`
    SELECT address_id, street, city, state, zip_code, is_default
    FROM Addresses
    WHERE receiver_id = ?
    ORDER BY is_default DESC, address_id DESC
    LIMIT 10
  `, [receiverId]);
}

async function getReceiverDefaultAddress(receiverId) {
  const rows = await query(`
    SELECT address_id, street, city, state, zip_code, is_default
    FROM Addresses
    WHERE receiver_id = ? AND is_default = TRUE
    LIMIT 1
  `, [receiverId]);
  return rows[0] || null;
}

async function getAvailableServices() {
  return query(`
    SELECT
      s.service_id,
      s.service_name,
      s.description,
      COUNT(ps.provider_id) AS active_provider_count,
      COALESCE(ROUND(MIN(ps.base_hourly_rate) * 1.15, 2), 0) AS min_hourly_rate,
      COALESCE(ROUND(MAX(ps.base_hourly_rate) * 1.15, 2), 0) AS max_hourly_rate,
      COALESCE(ROUND(AVG(ps.base_hourly_rate) * 1.15, 2), 0) AS average_hourly_rate
    FROM Services s
    LEFT JOIN Provider_Services ps ON s.service_id = ps.service_id AND ps.approval_status = 'approved'
    LEFT JOIN Providers p ON ps.provider_id = p.provider_id AND p.provider_status = 'active'
    WHERE ps.provider_id IS NULL OR p.provider_id IS NOT NULL
    GROUP BY s.service_id, s.service_name, s.description
    ORDER BY s.service_name
    LIMIT 20
  `);
}

async function getServiceRateSummary() {
  const byService = await query(`
    SELECT
      s.service_name,
      COUNT(ps.provider_id) AS active_provider_count,
      ROUND(MIN(ps.base_hourly_rate) * 1.15, 2) AS min_hourly_rate,
      ROUND(MAX(ps.base_hourly_rate) * 1.15, 2) AS max_hourly_rate,
      ROUND(AVG(ps.base_hourly_rate) * 1.15, 2) AS average_hourly_rate
    FROM Services s
    JOIN Provider_Services ps ON s.service_id = ps.service_id
    JOIN Providers p ON ps.provider_id = p.provider_id
    WHERE ps.approval_status = 'approved'
      AND p.provider_status = 'active'
    GROUP BY s.service_id, s.service_name
    ORDER BY s.service_name
  `);
  const overallRows = await query(`
    SELECT
      ROUND(MIN(ps.base_hourly_rate) * 1.15, 2) AS overall_min_hourly_rate,
      ROUND(MAX(ps.base_hourly_rate) * 1.15, 2) AS overall_max_hourly_rate,
      ROUND(AVG(ps.base_hourly_rate) * 1.15, 2) AS overall_average_hourly_rate
    FROM Provider_Services ps
    JOIN Providers p ON ps.provider_id = p.provider_id
    WHERE ps.approval_status = 'approved'
      AND p.provider_status = 'active'
  `);
  return {
    overall: overallRows[0] || null,
    by_service: byService,
    surcharge_rules: [
      { condition: 'Outside Monday-Friday 8:00 AM-5:00 PM', surcharge_rate: '20%' },
      { condition: 'Weekend booking', surcharge_rate: '10%' },
      { condition: 'Weekend and outside standard hours', surcharge_rate: '30%' }
    ],
    note: 'Rates are receiver-visible base hourly rates, including the platform fee. Appointment totals also depend on estimated or actual hours and schedule surcharges.'
  };
}

function serviceNameFromMessage(message = '') {
  const services = ['cleaning', 'plumbing', 'electrical', 'painting', 'landscaping'];
  return services.find((service) => message.toLowerCase().includes(service)) || null;
}

async function getProvidersForService(messageOrName) {
  const serviceName = serviceNameFromMessage(messageOrName) || String(messageOrName || '').toLowerCase();
  return query(`
    SELECT
      p.provider_id,
      p.display_name AS provider_name,
      p.provider_status,
      s.service_name,
      ROUND(ps.base_hourly_rate * 1.15, 2) AS base_hourly_rate,
      COALESCE(ROUND(AVG(CASE WHEN rev.review_direction = 'receiver_to_provider' THEN rev.rating END), 2), 0) AS average_rating
    FROM Provider_Services ps
    JOIN Providers p ON ps.provider_id = p.provider_id
        JOIN Services s ON ps.service_id = s.service_id
    LEFT JOIN Appointments a ON p.provider_id = a.provider_id
    LEFT JOIN Reviews rev ON a.app_id = rev.app_id
    WHERE ps.approval_status = 'approved'
      AND p.provider_status = 'active'
      AND LOWER(s.service_name) LIKE ?
    GROUP BY p.provider_id, p.display_name, p.provider_status, s.service_name, ps.base_hourly_rate
    ORDER BY average_rating DESC, p.display_name
    LIMIT 10
  `, [`%${serviceName}%`]);
}

async function getTopProvidersByAverageRating(limit = 5) {
  return query(`
    SELECT
      p.provider_id,
      p.display_name AS provider_name,
      p.provider_status,
      COALESCE(ROUND(AVG(CASE WHEN rev.review_direction = 'receiver_to_provider' THEN rev.rating END), 2), 0) AS average_rating,
      COUNT(CASE WHEN rev.review_direction = 'receiver_to_provider' THEN rev.review_id END) AS review_count,
      (
        SELECT GROUP_CONCAT(DISTINCT s.service_name ORDER BY s.service_name SEPARATOR ', ')
        FROM Provider_Services ps
        JOIN Services s ON ps.service_id = s.service_id
        WHERE ps.provider_id = p.provider_id
          AND ps.approval_status = 'approved'
      ) AS services
    FROM Providers p
        LEFT JOIN Appointments a ON p.provider_id = a.provider_id
    LEFT JOIN Reviews rev ON a.app_id = rev.app_id
    WHERE p.provider_status = 'active'
      AND EXISTS (
        SELECT 1
        FROM Provider_Services ps
        WHERE ps.provider_id = p.provider_id
          AND ps.approval_status = 'approved'
      )
    GROUP BY p.provider_id, p.display_name, p.provider_status
    HAVING review_count > 0
    ORDER BY average_rating DESC, review_count DESC, provider_name
    LIMIT ${Math.min(Number.parseInt(limit, 10) || 5, 10)}
  `);
}

async function getProviderWorkingHoursSummary() {
  const unavailableBlocks = await query(`
    SELECT
      b.provider_id,
      p.display_name AS provider_name,
      b.start_time,
      b.end_time,
      b.reason
    FROM Provider_Unavailable_Blocks b
    JOIN Providers p ON b.provider_id = p.provider_id
        WHERE b.end_time >= CURRENT_TIMESTAMP
    ORDER BY b.start_time ASC
    LIMIT 10
  `);
  return {
    standard_working_hours: {
      days: 'Monday-Friday',
      start_time: '08:00',
      end_time: '17:00',
      timezone: 'local application time'
    },
    surcharge_rules: [
      { condition: 'Outside Monday-Friday 8:00 AM-5:00 PM', surcharge_rate: '20%' },
      { condition: 'Weekend booking', surcharge_rate: '10%' },
      { condition: 'Weekend and outside standard hours', surcharge_rate: '30%' }
    ],
    unavailable_blocks: unavailableBlocks,
    note: 'Receivers can request bookings outside standard hours, but off-hours and weekend surcharges may apply. Provider-specific unavailable blocks cannot be booked.'
  };
}

async function getProviderPublicDetails(providerId) {
  const rows = await query(`
    SELECT
      p.provider_id,
      p.display_name AS provider_name,
      p.provider_status,
      p.biography,
      COALESCE(ROUND(AVG(CASE WHEN rev.review_direction = 'receiver_to_provider' THEN rev.rating END), 2), 0) AS average_rating
    FROM Providers p
        LEFT JOIN Appointments a ON p.provider_id = a.provider_id
    LEFT JOIN Reviews rev ON a.app_id = rev.app_id
    WHERE p.provider_id = ?
    GROUP BY p.provider_id, p.display_name, p.provider_status, p.biography
  `, [providerId]);
  return rows[0] || null;
}

async function getProviderServices(providerId) {
  return query(`
    SELECT s.service_name, ROUND(ps.base_hourly_rate * 1.15, 2) AS base_hourly_rate
    FROM Provider_Services ps
    JOIN Services s ON ps.service_id = s.service_id
    WHERE ps.provider_id = ? AND ps.approval_status = 'approved'
    ORDER BY s.service_name
  `, [providerId]);
}

async function getProviderAverageRating(providerId) {
  const rows = await query(`
    SELECT COALESCE(ROUND(AVG(rev.rating), 2), 0) AS average_rating
    FROM Reviews rev
    JOIN Appointments a ON rev.app_id = a.app_id
    WHERE a.provider_id = ? AND rev.review_direction = 'receiver_to_provider'
  `, [providerId]);
  return rows[0] || { average_rating: 0 };
}

async function getReceiverReviewStatus(receiverId, appId = null) {
  const params = [receiverId];
  let appClause = '';
  if (appId) {
    appClause = 'AND a.app_id = ?';
    params.push(appId);
  }
  return query(`
    SELECT
      a.app_id,
      a.appointment_status,
      s.service_name,
      p.display_name AS provider_name,
      MAX(CASE WHEN rev.review_direction = 'receiver_to_provider' THEN 1 ELSE 0 END) AS receiver_reviewed,
      MAX(CASE WHEN rev.review_direction = 'provider_to_receiver' THEN 1 ELSE 0 END) AS provider_reviewed
    FROM Appointments a
    JOIN Services s ON a.service_id = s.service_id
    JOIN Providers p ON a.provider_id = p.provider_id
        LEFT JOIN Reviews rev ON a.app_id = rev.app_id
    WHERE a.receiver_id = ? AND a.appointment_status = 'completed'
      ${appClause}
    GROUP BY a.app_id, a.appointment_status, s.service_name, p.display_name
    ORDER BY a.scheduled_time DESC
    LIMIT 10
  `, params);
}

module.exports = {
  getReceiverNextAppointment,
  getReceiverAppointments,
  getReceiverPendingAppointments,
  getReceiverCompletedAppointments,
  getReceiverPayments,
  getReceiverSpendingSummary,
  getReceiverUnpaidPayments,
  getReceiverAddresses,
  getReceiverDefaultAddress,
  getAvailableServices,
  getServiceRateSummary,
  getProvidersForService,
  getTopProvidersByAverageRating,
  getProviderWorkingHoursSummary,
  getProviderPublicDetails,
  getProviderServices,
  getProviderAverageRating,
  getReceiverReviewStatus
};

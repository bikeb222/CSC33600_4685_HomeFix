const { query } = require('../config/db');
const dashboardModel = require('../models/dashboardModel');

async function getDashboardStats() {
  return dashboardModel.stats({ role: 'manager' });
}

async function scalar(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || {};
}

function safeLimit(value, fallback = 10, max = 50) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

async function countReceivers() {
  return scalar('SELECT COUNT(*) AS count FROM Receivers');
}

async function countProviders() {
  return scalar('SELECT COUNT(*) AS count FROM Providers');
}

async function countServices() {
  return scalar('SELECT COUNT(*) AS count FROM Services');
}

async function countAppointments() {
  return scalar('SELECT COUNT(*) AS count FROM Appointments');
}

async function getAppointmentStatusDistribution() {
  return query(`
    SELECT appointment_status, COUNT(*) AS count
    FROM Appointments
    GROUP BY appointment_status
    ORDER BY count DESC
  `);
}

async function countAppointmentsByStatus(status) {
  return scalar('SELECT COUNT(*) AS count FROM Appointments WHERE appointment_status = ?', [status]);
}

async function getPaymentStatusDistribution() {
  return query(`
    SELECT payment_status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total_amount
    FROM Payments
    GROUP BY payment_status
    ORDER BY count DESC
  `);
}

async function getRevenueSummary() {
  return scalar(`
    SELECT
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS total_paid_revenue,
      COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END), 0) AS unpaid_amount,
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN commission_fee ELSE 0 END), 0) AS total_commission_fee,
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN provider_payout ELSE 0 END), 0) AS total_provider_payout
    FROM Payments
  `);
}

async function getServiceRateSummary() {
  const byService = await query(`
    SELECT
      s.service_name,
      COUNT(ps.provider_id) AS active_provider_count,
      MIN(ps.base_hourly_rate) AS min_hourly_rate,
      MAX(ps.base_hourly_rate) AS max_hourly_rate,
      ROUND(AVG(ps.base_hourly_rate), 2) AS average_hourly_rate
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
      MIN(ps.base_hourly_rate) AS overall_min_hourly_rate,
      MAX(ps.base_hourly_rate) AS overall_max_hourly_rate,
      ROUND(AVG(ps.base_hourly_rate), 2) AS overall_average_hourly_rate
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
    note: 'Use provider-service base hourly rates for hourly price questions. Do not infer hourly cost from revenue.'
  };
}

async function getProviderWorkingHoursSummary() {
  const unavailableBlocks = await query(`
    SELECT
      b.block_id,
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
  const busyAppointments = await query(`
    SELECT
      a.app_id,
      a.provider_id,
      p.display_name AS provider_name,
      s.service_name,
      a.appointment_status,
      a.scheduled_time,
      COALESCE(a.actual_hours, a.estimated_hours) AS booked_hours
    FROM Appointments a
    JOIN Providers p ON a.provider_id = p.provider_id
        JOIN Services s ON a.service_id = s.service_id
    WHERE a.appointment_status IN ('accepted', 'in_progress')
      AND a.scheduled_time >= CURRENT_TIMESTAMP
    ORDER BY a.scheduled_time ASC
    LIMIT 10
  `);
  return {
    standard_working_hours: {
      days: 'Monday-Friday',
      start_time: '08:00',
      end_time: '17:00',
      timezone: 'local application time'
    },
    off_hours_policy: [
      { condition: 'Outside Monday-Friday 8:00 AM-5:00 PM', surcharge_rate: '20%' },
      { condition: 'Weekend booking', surcharge_rate: '10%' },
      { condition: 'Weekend and outside standard hours', surcharge_rate: '30%' }
    ],
    conflict_policy: 'A provider cannot accept two appointments at the same time. Accepted and in-progress appointments block that provider time.',
    unavailable_blocks: unavailableBlocks,
    accepted_or_in_progress_busy_appointments: busyAppointments,
    note: 'Providers share the same standard working-hours rule, and each provider may add unavailable blocks on top of that rule.'
  };
}

async function getTopProvidersByCompletedAppointments(limit = 5) {
  const rowLimit = safeLimit(limit, 5);
  return query(`
    SELECT p.provider_id, p.display_name AS provider_name, COUNT(*) AS completed_count
    FROM Appointments a
    JOIN Providers p ON a.provider_id = p.provider_id
        WHERE a.appointment_status = 'completed'
    GROUP BY p.provider_id, p.display_name
    ORDER BY completed_count DESC, provider_name
    LIMIT ${rowLimit}
  `);
}

async function getTopProvidersByAverageRating(limit = 5) {
  const rowLimit = safeLimit(limit, 5);
  return query(`
    SELECT
      p.provider_id,
      p.display_name AS provider_name,
      p.provider_status,
      ROUND(AVG(rev.rating), 2) AS average_rating,
      COUNT(rev.review_id) AS review_count
    FROM Providers p
        JOIN Appointments a ON p.provider_id = a.provider_id
    JOIN Reviews rev ON a.app_id = rev.app_id AND rev.review_direction = 'receiver_to_provider'
    WHERE p.provider_status = 'active'
      AND EXISTS (
        SELECT 1
        FROM Provider_Services ps
        WHERE ps.provider_id = p.provider_id
          AND ps.approval_status = 'approved'
      )
    GROUP BY p.provider_id, p.display_name, p.provider_status
    ORDER BY average_rating DESC, review_count DESC
    LIMIT ${rowLimit}
  `);
}

async function getLowRatingProviders(limit = 5) {
  const rowLimit = safeLimit(limit, 5);
  return query(`
    SELECT p.provider_id, p.display_name AS provider_name, ROUND(AVG(rev.rating), 2) AS average_rating, COUNT(rev.review_id) AS review_count
    FROM Providers p
        JOIN Appointments a ON p.provider_id = a.provider_id
    JOIN Reviews rev ON a.app_id = rev.app_id AND rev.review_direction = 'receiver_to_provider'
    GROUP BY p.provider_id, p.display_name
    ORDER BY average_rating ASC, review_count DESC
    LIMIT ${rowLimit}
  `);
}

async function getTopServicesByAppointments(limit = 5) {
  const rowLimit = safeLimit(limit, 5);
  return query(`
    SELECT s.service_id, s.service_name, COUNT(a.app_id) AS appointment_count
    FROM Services s
    LEFT JOIN Appointments a ON s.service_id = a.service_id
    GROUP BY s.service_id, s.service_name
    ORDER BY appointment_count DESC, s.service_name
    LIMIT ${rowLimit}
  `);
}

async function getRevenueByService(limit = 10) {
  const rowLimit = safeLimit(limit, 10);
  return query(`
    SELECT s.service_name, COALESCE(SUM(pay.total_amount), 0) AS paid_revenue, COALESCE(SUM(pay.commission_fee), 0) AS commission_fee
    FROM Services s
    LEFT JOIN Appointments a ON s.service_id = a.service_id
    LEFT JOIN Payments pay ON a.app_id = pay.app_id AND pay.payment_status = 'paid'
    GROUP BY s.service_id, s.service_name
    ORDER BY paid_revenue DESC
    LIMIT ${rowLimit}
  `);
}

async function getUnpaidPayments(limit = 10) {
  const rowLimit = safeLimit(limit, 10);
  return query(`
    SELECT pay.payment_id, pay.app_id, pay.total_amount, r.display_name AS receiver_name, p.display_name AS provider_name, s.service_name
    FROM Payments pay
    JOIN Appointments a ON pay.app_id = a.app_id
    JOIN Receivers r ON a.receiver_id = r.receiver_id
        JOIN Providers p ON a.provider_id = p.provider_id
        JOIN Services s ON a.service_id = s.service_id
    WHERE pay.payment_status = 'unpaid'
    ORDER BY pay.payment_id DESC
    LIMIT ${rowLimit}
  `);
}

async function getCompletedAppointmentsWithoutPayment(limit = 10) {
  const rowLimit = safeLimit(limit, 10);
  return query(`
    SELECT a.app_id, a.scheduled_time, r.display_name AS receiver_name, p.display_name AS provider_name, s.service_name, a.actual_total
    FROM Appointments a
    JOIN Receivers r ON a.receiver_id = r.receiver_id
        JOIN Providers p ON a.provider_id = p.provider_id
        JOIN Services s ON a.service_id = s.service_id
    LEFT JOIN Payments pay ON a.app_id = pay.app_id
    WHERE a.appointment_status = 'completed' AND pay.payment_id IS NULL
    ORDER BY a.scheduled_time DESC
    LIMIT ${rowLimit}
  `);
}

async function getPendingAppointmentsOlderThan(hours = 48) {
  return query(`
    SELECT a.app_id, a.scheduled_time, r.display_name AS receiver_name, p.display_name AS provider_name, s.service_name
    FROM Appointments a
    JOIN Receivers r ON a.receiver_id = r.receiver_id
        JOIN Providers p ON a.provider_id = p.provider_id
        JOIN Services s ON a.service_id = s.service_id
    WHERE a.appointment_status = 'pending'
      AND a.created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? HOUR)
    ORDER BY a.created_at ASC
    LIMIT 10
  `, [Number(hours)]);
}

async function getReceiversByAppointmentCount(limit = 5) {
  const rowLimit = safeLimit(limit, 5);
  return query(`
    SELECT r.receiver_id, r.display_name AS receiver_name, COUNT(a.app_id) AS appointment_count
    FROM Receivers r
        LEFT JOIN Appointments a ON r.receiver_id = a.receiver_id
    GROUP BY r.receiver_id, r.display_name
    ORDER BY appointment_count DESC, receiver_name
    LIMIT ${rowLimit}
  `);
}

async function getProvidersWithNoServices() {
  return query(`
    SELECT p.provider_id, p.display_name AS provider_name, p.provider_status
    FROM Providers p
        LEFT JOIN Provider_Services ps ON p.provider_id = ps.provider_id
    WHERE ps.provider_id IS NULL
    ORDER BY provider_name
    LIMIT 10
  `);
}

async function getActiveProvidersWithNoAppointments() {
  return query(`
    SELECT p.provider_id, p.display_name AS provider_name
    FROM Providers p
        LEFT JOIN Appointments a ON p.provider_id = a.provider_id
    WHERE p.provider_status = 'active'
    GROUP BY p.provider_id, p.display_name
    HAVING COUNT(a.app_id) = 0
    ORDER BY provider_name
    LIMIT 10
  `);
}

async function getLowRatingReviews(limit = 10) {
  const rowLimit = safeLimit(limit, 10);
  return query(`
    SELECT rev.review_id, rev.app_id, rev.rating, rev.review_direction, rev.comment, p.display_name AS provider_name, r.display_name AS receiver_name
    FROM Reviews rev
    JOIN Appointments a ON rev.app_id = a.app_id
    JOIN Providers p ON a.provider_id = p.provider_id
        JOIN Receivers r ON a.receiver_id = r.receiver_id
        WHERE rev.rating <= 3
    ORDER BY rev.rating ASC, rev.created_at DESC
    LIMIT ${rowLimit}
  `);
}

async function getReviewAnalytics() {
  const [overall, byDirection, withoutReviews] = await Promise.all([
    scalar('SELECT COALESCE(ROUND(AVG(rating), 2), 0) AS average_rating, COUNT(*) AS review_count FROM Reviews'),
    query('SELECT review_direction, COUNT(*) AS count, COALESCE(ROUND(AVG(rating), 2), 0) AS average_rating FROM Reviews GROUP BY review_direction'),
    query(`
      SELECT a.app_id, s.service_name, a.appointment_status
      FROM Appointments a
      JOIN Services s ON a.service_id = s.service_id
      LEFT JOIN Reviews rev ON a.app_id = rev.app_id
      WHERE a.appointment_status = 'completed'
      GROUP BY a.app_id, s.service_name, a.appointment_status
      HAVING COUNT(rev.review_id) = 0
      LIMIT 10
    `)
  ]);
  return { overall, by_direction: byDirection, completed_without_reviews: withoutReviews };
}

async function getServicePerformance() {
  const [topServices, revenueByService] = await Promise.all([
    getTopServicesByAppointments(10),
    getRevenueByService(10)
  ]);
  return { top_services: topServices, revenue_by_service: revenueByService };
}

module.exports = {
  getDashboardStats,
  countReceivers,
  countProviders,
  countServices,
  countAppointments,
  getAppointmentStatusDistribution,
  countAppointmentsByStatus,
  getPaymentStatusDistribution,
  getRevenueSummary,
  getServiceRateSummary,
  getProviderWorkingHoursSummary,
  getTopProvidersByCompletedAppointments,
  getTopProvidersByAverageRating,
  getLowRatingProviders,
  getTopServicesByAppointments,
  getRevenueByService,
  getUnpaidPayments,
  getCompletedAppointmentsWithoutPayment,
  getPendingAppointmentsOlderThan,
  getReceiversByAppointmentCount,
  getProvidersWithNoServices,
  getActiveProvidersWithNoAppointments,
  getLowRatingReviews,
  getReviewAnalytics,
  getServicePerformance
};

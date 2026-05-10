const { query } = require('../config/db');

async function run(executor, sql, params = []) {
  if (executor) {
    const [rows] = await executor.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

const appointmentSelect = `
  SELECT
    a.app_id,
    a.receiver_id,
    r.display_name AS receiver_name,
    a.provider_id,
    p.display_name AS provider_name,
    a.service_id,
    s.service_name,
    a.address_id,
    CONCAT(ad.street, ', ', ad.city, ', ', COALESCE(ad.state, ''), ' ', COALESCE(ad.zip_code, '')) AS address_label,
    ad.zip_code,
    a.appointment_status,
    a.scheduled_time,
    a.hourly_rate_at_booking,
    a.schedule_surcharge_rate,
    a.schedule_surcharge_reason,
    a.estimated_hours,
    a.tip_amount,
    a.estimated_total,
    a.actual_hours,
    a.actual_total,
    a.created_at,
    CASE
      WHEN a.appointment_status = 'pending' THEN (
        SELECT COUNT(*)
        FROM Appointments other
        WHERE other.provider_id = a.provider_id
          AND other.app_id <> a.app_id
          AND other.appointment_status = 'pending'
          AND a.scheduled_time < DATE_ADD(other.scheduled_time, INTERVAL CEIL(other.estimated_hours * 60) MINUTE)
          AND DATE_ADD(a.scheduled_time, INTERVAL CEIL(a.estimated_hours * 60) MINUTE) > other.scheduled_time
      )
      ELSE 0
    END AS pending_overlap_count
  FROM Appointments a
  JOIN Receivers r ON a.receiver_id = r.receiver_id
  JOIN Providers p ON a.provider_id = p.provider_id
  JOIN Services s ON a.service_id = s.service_id
  JOIN Addresses ad ON a.address_id = ad.address_id
`;

async function list(filters = {}) {
  const where = [];
  const params = [];

  if (filters.appId) {
    where.push('a.app_id = ?');
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
  if (filters.status) {
    where.push('a.appointment_status = ?');
    params.push(filters.status);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return query(`
    ${appointmentSelect}
    ${whereClause}
    ORDER BY a.scheduled_time DESC, a.app_id DESC
  `, params);
}

async function findById(id) {
  const rows = await list({ appId: id });
  return rows[0] || null;
}

async function create(appointment, executor = null) {
  const result = await run(executor, `
    INSERT INTO Appointments (
      receiver_id,
      provider_id,
      service_id,
      address_id,
      scheduled_time,
      hourly_rate_at_booking,
      schedule_surcharge_rate,
      schedule_surcharge_reason,
      estimated_hours,
      tip_amount
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    appointment.receiver_id,
    appointment.provider_id,
    appointment.service_id,
    appointment.address_id,
    appointment.scheduled_time,
    appointment.hourly_rate_at_booking,
    appointment.schedule_surcharge_rate,
    appointment.schedule_surcharge_reason,
    appointment.estimated_hours,
    appointment.tip_amount || 0
  ]);
  return result.insertId;
}

async function updateStatus(id, status) {
  const result = await query(`
    UPDATE Appointments
    SET
      appointment_status = ?,
      actual_hours = CASE
        WHEN ? = 'completed' AND actual_hours IS NULL THEN estimated_hours
        ELSE actual_hours
      END
    WHERE app_id = ?
  `, [status, status, id]);
  return result.affectedRows;
}

async function updatePendingRequest(id, appointment, executor = null) {
  const result = await run(executor, `
    UPDATE Appointments
    SET
      scheduled_time = ?,
      hourly_rate_at_booking = ?,
      schedule_surcharge_rate = ?,
      schedule_surcharge_reason = ?,
      estimated_hours = ?,
      tip_amount = ?
    WHERE app_id = ?
  `, [
    appointment.scheduled_time,
    appointment.hourly_rate_at_booking,
    appointment.schedule_surcharge_rate,
    appointment.schedule_surcharge_reason,
    appointment.estimated_hours,
    appointment.tip_amount,
    id
  ]);
  return result.affectedRows;
}

async function updateStatusInTransaction(id, status, executor) {
  const result = await run(executor, `
    UPDATE Appointments
    SET
      appointment_status = ?,
      actual_hours = CASE
        WHEN ? = 'completed' AND actual_hours IS NULL THEN estimated_hours
        ELSE actual_hours
      END
    WHERE app_id = ?
  `, [status, status, id]);
  return result.affectedRows;
}

async function updateActualHours(id, actualHours, executor = null) {
  const result = await run(executor, `
    UPDATE Appointments
    SET actual_hours = ?
    WHERE app_id = ?
  `, [actualHours, id]);
  return result.affectedRows;
}

async function remove(id) {
  const result = await query('DELETE FROM Appointments WHERE app_id = ?', [id]);
  return result.affectedRows;
}

async function providerService(providerId, serviceId, executor = null) {
  const rows = await run(executor, `
    SELECT provider_id, service_id, base_hourly_rate, approval_status
    FROM Provider_Services
    WHERE provider_id = ? AND service_id = ? AND approval_status = 'approved'
  `, [providerId, serviceId]);
  return rows[0] || null;
}

async function providerUnavailableTimes(providerId, excludeAppId = null) {
  const params = [providerId];
  let excludeClause = '';
  if (excludeAppId) {
    excludeClause = 'AND app_id <> ?';
    params.push(excludeAppId);
  }
  const appointmentBlocks = await query(`
    SELECT
      CONCAT('appointment-', app_id) AS block_key,
      appointment_status AS block_type,
      app_id,
      NULL AS block_id,
      appointment_status,
      scheduled_time AS start_time,
      DATE_ADD(scheduled_time, INTERVAL CEIL(COALESCE(actual_hours, estimated_hours) * 60) MINUTE) AS end_time,
      scheduled_time,
      COALESCE(actual_hours, estimated_hours) AS blocked_hours,
      DATE_ADD(scheduled_time, INTERVAL CEIL(COALESCE(actual_hours, estimated_hours) * 60) MINUTE) AS blocked_until,
      NULL AS reason
    FROM Appointments
    WHERE provider_id = ?
      AND appointment_status IN ('pending', 'accepted', 'in_progress')
      ${excludeClause}
    ORDER BY scheduled_time
  `, params);
  const manualBlocks = await query(`
    SELECT
      CONCAT('manual-', block_id) AS block_key,
      'manual' AS block_type,
      NULL AS app_id,
      block_id,
      'unavailable' AS appointment_status,
      start_time,
      end_time,
      start_time AS scheduled_time,
      ROUND(TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60, 2) AS blocked_hours,
      end_time AS blocked_until,
      reason
    FROM Provider_Unavailable_Blocks
    WHERE provider_id = ?
    ORDER BY start_time
  `, [providerId]);
  return [...appointmentBlocks, ...manualBlocks].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

async function providerHasConflict(providerId, scheduledTime, hours, excludeAppId = null, executor = null) {
  const params = [
    providerId,
    scheduledTime,
    Number(hours) * 60,
    scheduledTime
  ];
  let excludeClause = '';
  if (excludeAppId) {
    excludeClause = 'AND app_id <> ?';
    params.push(excludeAppId);
  }
  const rows = await run(executor, `
    SELECT 'appointment' AS conflict_type, app_id, NULL AS block_id
    FROM Appointments
    WHERE provider_id = ?
      AND appointment_status IN ('accepted', 'in_progress')
      AND scheduled_time < DATE_ADD(?, INTERVAL CEIL(?) MINUTE)
      AND DATE_ADD(scheduled_time, INTERVAL CEIL(COALESCE(actual_hours, estimated_hours) * 60) MINUTE) > ?
      ${excludeClause}
    LIMIT 1
  `, params);
  if (rows[0]) {
    return rows[0];
  }
  const blockRows = await run(executor, `
    SELECT 'manual' AS conflict_type, NULL AS app_id, block_id
    FROM Provider_Unavailable_Blocks
    WHERE provider_id = ?
      AND start_time < DATE_ADD(?, INTERVAL CEIL(?) MINUTE)
      AND end_time > ?
    LIMIT 1
  `, [providerId, scheduledTime, Number(hours) * 60, scheduledTime]);
  return blockRows[0] || null;
}

async function pendingQueueAhead(providerId, scheduledTime, hours, executor = null, excludeAppId = null) {
  const params = [
    providerId,
    scheduledTime,
    Number(hours) * 60,
    scheduledTime
  ];
  let excludeClause = '';
  if (excludeAppId) {
    excludeClause = 'AND app_id <> ?';
    params.push(excludeAppId);
  }
  const rows = await run(executor, `
    SELECT COUNT(*) AS queue_count
    FROM Appointments
    WHERE provider_id = ?
      AND appointment_status = 'pending'
      AND scheduled_time < DATE_ADD(?, INTERVAL CEIL(?) MINUTE)
      AND DATE_ADD(scheduled_time, INTERVAL CEIL(estimated_hours * 60) MINUTE) > ?
      ${excludeClause}
  `, params);
  return Number(rows[0]?.queue_count || 0);
}

async function rejectPendingConflicts(appointment, executor) {
  const result = await run(executor, `
    UPDATE Appointments
    SET appointment_status = 'rejected'
    WHERE provider_id = ?
      AND app_id <> ?
      AND appointment_status = 'pending'
      AND scheduled_time < DATE_ADD(?, INTERVAL CEIL(?) MINUTE)
      AND DATE_ADD(scheduled_time, INTERVAL CEIL(estimated_hours * 60) MINUTE) > ?
  `, [
    appointment.provider_id,
    appointment.app_id,
    appointment.scheduled_time,
    Number(appointment.actual_hours || appointment.estimated_hours) * 60,
    appointment.scheduled_time
  ]);
  return result.affectedRows;
}

async function lockProvider(providerId, executor) {
  const rows = await run(executor, `
    SELECT provider_id
    FROM Providers
    WHERE provider_id = ?
    FOR UPDATE
  `, [providerId]);
  return rows[0] || null;
}

async function lockAppointment(id, executor) {
  const rows = await run(executor, `
    SELECT *
    FROM Appointments
    WHERE app_id = ?
    FOR UPDATE
  `, [id]);
  return rows[0] || null;
}

async function receiverExists(receiverId, executor = null) {
  const rows = await run(executor, 'SELECT receiver_id FROM Receivers WHERE receiver_id = ?', [receiverId]);
  return Boolean(rows[0]);
}

async function addressBelongsToReceiver(receiverId, addressId, executor = null) {
  const rows = await run(executor, `
    SELECT address_id
    FROM Addresses
    WHERE receiver_id = ? AND address_id = ?
  `, [receiverId, addressId]);
  return Boolean(rows[0]);
}

module.exports = {
  list,
  findById,
  create,
  updateStatus,
  updateActualHours,
  updatePendingRequest,
  remove,
  providerService,
  providerUnavailableTimes,
  providerHasConflict,
  pendingQueueAhead,
  rejectPendingConflicts,
  lockProvider,
  lockAppointment,
  updateStatusInTransaction,
  receiverExists,
  addressBelongsToReceiver
};

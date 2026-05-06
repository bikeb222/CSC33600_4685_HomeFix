const { query } = require('../config/db');
const { buildUpdateSet } = require('../utils/sql');

const receiverColumns = `
  r.receiver_id,
  CONCAT('receiver:', r.receiver_id) AS user_id,
  r.display_name AS username,
  r.display_name,
  r.email,
  r.phone,
  r.is_active,
  r.language,
  r.wallet_balance,
  r.created_at
`;

async function list(search = '') {
  const params = [];
  let whereClause = '';

  if (search) {
    whereClause = `
      WHERE CONCAT_WS(' ', r.display_name, r.email, r.phone, r.language) LIKE ?
    `;
    params.push(`%${search}%`);
  }

  return query(`
    SELECT
      ${receiverColumns},
      COUNT(DISTINCT ad.address_id) AS address_count,
      COUNT(DISTINCT ap.app_id) AS appointment_count
    FROM Receivers r
    LEFT JOIN Addresses ad ON r.receiver_id = ad.receiver_id
    LEFT JOIN Appointments ap ON r.receiver_id = ap.receiver_id
    ${whereClause}
    GROUP BY r.receiver_id, r.display_name, r.email, r.phone, r.is_active, r.language, r.wallet_balance, r.created_at
    ORDER BY r.receiver_id DESC
  `, params);
}

async function findById(id) {
  const rows = await query(`
    SELECT ${receiverColumns}
    FROM Receivers r
    WHERE r.receiver_id = ?
  `, [id]);
  return rows[0] || null;
}

async function create(receiver) {
  const result = await query(`
    INSERT INTO Receivers (email, password_hash, display_name, phone, is_active, language)
    VALUES (?, ?, ?, ?, TRUE, ?)
  `, [
    receiver.email,
    receiver.password_hash,
    receiver.display_name,
    receiver.phone || null,
    receiver.language || null
  ]);
  return result.insertId;
}

async function update(id, payload) {
  const { setClause, values } = buildUpdateSet(payload, ['display_name', 'phone', 'is_active', 'language', 'wallet_balance']);
  const result = await query(`UPDATE Receivers SET ${setClause} WHERE receiver_id = ?`, [...values, id]);
  return result.affectedRows;
}

async function remove(id) {
  const result = await query('DELETE FROM Receivers WHERE receiver_id = ?', [id]);
  return result.affectedRows;
}

async function adjustWallet(receiverId, amount) {
  const result = await query(`
    UPDATE Receivers
    SET wallet_balance = wallet_balance + ?
    WHERE receiver_id = ? AND wallet_balance + ? >= 0
  `, [amount, receiverId, amount]);
  return result.affectedRows;
}

async function rechargeWithProcedure(receiverId, amount) {
  const resultSets = await query('CALL sp_receiver_recharge(?, ?)', [receiverId, amount]);
  const receiverRow = Array.isArray(resultSets?.[0]) ? resultSets[0][0] : resultSets?.[0];
  return receiverRow?.receiver_id;
}

module.exports = {
  list,
  findById,
  create,
  update,
  adjustWallet,
  rechargeWithProcedure,
  remove
};

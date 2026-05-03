const { query } = require('../config/db');
const { buildUpdateSet } = require('../utils/sql');

async function run(executor, sql, params) {
  if (executor) {
    const [rows] = await executor.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

async function listForReceiver(receiverId) {
  return query(`
    SELECT address_id, receiver_id, street, city, state, zip_code, is_default
    FROM Addresses
    WHERE receiver_id = ?
    ORDER BY is_default DESC, address_id DESC
  `, [receiverId]);
}

async function findById(id) {
  const rows = await query(`
    SELECT address_id, receiver_id, street, city, state, zip_code, is_default
    FROM Addresses
    WHERE address_id = ?
  `, [id]);
  return rows[0] || null;
}

async function findForReceiver(receiverId, addressId) {
  const rows = await query(`
    SELECT address_id, receiver_id, street, city, state, zip_code, is_default
    FROM Addresses
    WHERE receiver_id = ? AND address_id = ?
  `, [receiverId, addressId]);
  return rows[0] || null;
}

async function create(address, executor = null) {
  const result = await run(executor, `
    INSERT INTO Addresses (receiver_id, street, city, state, zip_code, is_default)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    address.receiver_id,
    address.street,
    address.city,
    address.state || null,
    address.zip_code || null,
    Boolean(address.is_default)
  ]);
  return result.insertId;
}

async function update(id, payload, executor = null) {
  const { setClause, values } = buildUpdateSet(payload, ['street', 'city', 'state', 'zip_code', 'is_default']);
  const result = await run(executor, `UPDATE Addresses SET ${setClause} WHERE address_id = ?`, [...values, id]);
  return result.affectedRows;
}

async function clearDefault(receiverId, executor = null) {
  return run(executor, 'UPDATE Addresses SET is_default = FALSE WHERE receiver_id = ?', [receiverId]);
}

async function setDefault(receiverId, addressId, executor = null) {
  const result = await run(executor, `
    UPDATE Addresses
    SET is_default = TRUE
    WHERE receiver_id = ? AND address_id = ?
  `, [receiverId, addressId]);
  return result.affectedRows;
}

async function remove(id) {
  const result = await query('DELETE FROM Addresses WHERE address_id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  listForReceiver,
  findById,
  findForReceiver,
  create,
  update,
  clearDefault,
  setDefault,
  remove
};

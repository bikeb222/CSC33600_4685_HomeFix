const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const { requireFields, validateEmail, assertStatus } = require('../utils/validators');

const roles = ['manager', 'provider', 'receiver'];

function jwtSecret() {
  return process.env.JWT_SECRET || 'homefix_local_dev_secret_change_me';
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function signToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      role: user.role,
      receiver_id: user.receiver_id || null,
      provider_id: user.provider_id || null,
      manager_id: user.manager_id || null
    },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function register(payload, actor = null) {
  requireFields(payload, ['role', 'email', 'password', 'display_name']);
  assertStatus(payload.role, roles, 'role');
  validateEmail(payload.email);

  if (payload.role === 'manager' && actor?.role !== 'manager') {
    throw new AppError('Manager accounts can only be created by a manager', 403);
  }

  const existing = await userModel.findByEmail(payload.email, payload.role);
  if (existing) {
    throw new AppError('Email is already registered for this role', 409);
  }

  const password_hash = await bcrypt.hash(payload.password, 10);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const userPayload = {
      email: payload.email,
      password_hash,
      display_name: payload.display_name,
      phone: payload.phone
    };

    let roleId;
    if (payload.role === 'receiver') {
      roleId = await userModel.createReceiver(userPayload, payload, connection);
    } else if (payload.role === 'provider') {
      roleId = await userModel.createProvider(userPayload, payload, connection);
    } else {
      roleId = await userModel.createManager(userPayload, payload, connection);
    }

    await connection.commit();
    return sanitizeUser(await userModel.findById(userModel.userId(payload.role, roleId)));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function login(payload) {
  requireFields(payload, ['role', 'email', 'password']);
  assertStatus(payload.role, roles, 'role');
  validateEmail(payload.email);
  const user = await userModel.findByEmail(payload.email, payload.role);

  const passwordMatches = user ? await bcrypt.compare(payload.password, user.password_hash) : false;
  if (!user || !passwordMatches || !user.is_active) {
    throw new AppError('Invalid email or password', 401);
  }

  const safeUser = sanitizeUser(user);
  return {
    token: signToken(safeUser),
    user: safeUser
  };
}

async function me(userId) {
  const user = await userModel.findById(userId);
  if (!user || !user.is_active) {
    throw new AppError('User is not active', 401);
  }
  return sanitizeUser(user);
}

async function listUsers(filters) {
  return userModel.list(filters);
}

async function updateUser(id, payload) {
  const updatePayload = {};
  ['display_name', 'phone', 'is_active'].forEach((field) => {
    if (payload[field] !== undefined) {
      updatePayload[field] = field === 'is_active' ? Boolean(payload[field]) : payload[field] || null;
    }
  });
  if (Object.keys(updatePayload).length === 0) {
    throw new AppError('No user fields were provided for update', 400);
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const affectedRows = await userModel.update(id, updatePayload, connection);
    if (!affectedRows) {
      throw new AppError('User not found', 404);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return me(id);
}

module.exports = {
  register,
  login,
  me,
  listUsers,
  updateUser
};

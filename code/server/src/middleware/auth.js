const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const AppError = require('../utils/AppError');

function jwtSecret() {
  return process.env.JWT_SECRET || 'homefix_local_dev_secret_change_me';
}

async function authenticate(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Authentication is required', 401);
    }
    const payload = jwt.verify(token, jwtSecret());
    req.user = await authService.me(payload.user_id);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AppError('Invalid or expired token', 401));
      return;
    }
    next(error);
  }
}

function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('You do not have permission to access this resource', 403));
      return;
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles
};

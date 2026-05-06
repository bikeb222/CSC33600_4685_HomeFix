const authService = require('../services/authService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

function requireManager(req) {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can manage user accounts', 403);
  }
}

exports.list = asyncHandler(async (req, res) => {
  requireManager(req);
  const users = await authService.listUsers({
    role: req.query.role || '',
    search: req.query.search || ''
  });
  res.json(users);
});

exports.create = asyncHandler(async (req, res) => {
  requireManager(req);
  const user = await authService.register(req.body, req.user);
  res.status(201).json(user);
});

exports.update = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager' && String(req.user.user_id) !== String(req.params.id)) {
    throw new AppError('You can only update your own profile', 403);
  }
  const user = await authService.updateUser(req.params.id, req.body);
  res.json(user);
});

const authService = require('../services/authService');
const asyncHandler = require('../middleware/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body, req.user || null);
  res.status(201).json(user);
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

exports.me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.user_id);
  res.json(user);
});

exports.logout = asyncHandler(async (req, res) => {
  res.status(204).send();
});

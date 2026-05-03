const serviceService = require('../services/serviceService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

function requireManager(req) {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can manage services', 403);
  }
}

exports.list = asyncHandler(async (req, res) => {
  const services = await serviceService.list(req.query.search || '');
  res.json(services);
});

exports.getById = asyncHandler(async (req, res) => {
  const service = await serviceService.getById(req.params.id);
  res.json(service);
});

exports.create = asyncHandler(async (req, res) => {
  requireManager(req);
  const service = await serviceService.create(req.body);
  res.status(201).json(service);
});

exports.update = asyncHandler(async (req, res) => {
  requireManager(req);
  const service = await serviceService.update(req.params.id, req.body);
  res.json(service);
});

exports.remove = asyncHandler(async (req, res) => {
  requireManager(req);
  await serviceService.remove(req.params.id);
  res.status(204).send();
});

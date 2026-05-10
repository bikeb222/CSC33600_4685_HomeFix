const providerService = require('../services/providerService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

function requireProviderAccess(req, providerId) {
  if (req.user.role === 'manager') {
    return;
  }
  if (req.user.role !== 'provider' || Number(req.user.provider_id) !== Number(providerId)) {
    throw new AppError('You do not have permission to modify this provider', 403);
  }
}

exports.register = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can create provider accounts here', 403);
  }
  const provider = await providerService.register(req.body, req.user);
  res.status(201).json(provider);
});

exports.list = asyncHandler(async (req, res) => {
  const providers = await providerService.list({
    search: req.query.search || '',
    serviceId: req.query.serviceId || null,
    activeOnly: req.user.role === 'receiver',
    viewerRole: req.user.role
  });
  res.json(providers);
});

exports.getById = asyncHandler(async (req, res) => {
  const provider = await providerService.getById(req.params.id);
  res.json(provider);
});

exports.update = asyncHandler(async (req, res) => {
  requireProviderAccess(req, req.params.id);
  const provider = await providerService.update(req.params.id, req.body);
  res.json(provider);
});

exports.remove = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can delete providers', 403);
  }
  await providerService.remove(req.params.id);
  res.status(204).send();
});

exports.listServices = asyncHandler(async (req, res) => {
  const services = await providerService.listServices(req.params.id, req.user.role);
  res.json(services);
});

exports.addService = asyncHandler(async (req, res) => {
  requireProviderAccess(req, req.params.id);
  const services = await providerService.addService(req.params.id, req.body, req.user);
  res.status(201).json(services);
});

exports.listServiceApprovals = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can review provider service requests', 403);
  }
  const requests = await providerService.listServiceApprovals(req.query.status || '');
  res.json(requests);
});

exports.reviewService = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can review provider service requests', 403);
  }
  const services = await providerService.reviewService(
    req.params.providerId,
    req.params.serviceId,
    req.body.approval_status,
    req.user.manager_id
  );
  res.json(services);
});

exports.listUnavailableBlocks = asyncHandler(async (req, res) => {
  requireProviderAccess(req, req.params.id);
  const blocks = await providerService.listUnavailableBlocks(req.params.id);
  res.json(blocks);
});

exports.addUnavailableBlock = asyncHandler(async (req, res) => {
  requireProviderAccess(req, req.params.id);
  const block = await providerService.addUnavailableBlock(req.params.id, req.body);
  res.status(201).json(block);
});

exports.removeUnavailableBlock = asyncHandler(async (req, res) => {
  requireProviderAccess(req, req.params.id);
  await providerService.removeUnavailableBlock(req.params.id, req.params.blockId);
  res.status(204).send();
});

exports.removeService = asyncHandler(async (req, res) => {
  requireProviderAccess(req, req.params.providerId);
  await providerService.removeService(req.params.providerId, req.params.serviceId);
  res.status(204).send();
});

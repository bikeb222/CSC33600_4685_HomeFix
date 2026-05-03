const receiverService = require('../services/receiverService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

function requireReceiverAccess(req, receiverId) {
  if (req.user.role === 'manager') {
    return;
  }
  if (req.user.role !== 'receiver' || Number(req.user.receiver_id) !== Number(receiverId)) {
    throw new AppError('You do not have permission to access this receiver', 403);
  }
}

exports.register = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can create receiver accounts here', 403);
  }
  const receiver = await receiverService.register(req.body, req.user);
  res.status(201).json(receiver);
});

exports.list = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can list all receivers', 403);
  }
  const receivers = await receiverService.list(req.query.search || '');
  res.json(receivers);
});

exports.getById = asyncHandler(async (req, res) => {
  requireReceiverAccess(req, req.params.id);
  const receiver = await receiverService.getById(req.params.id);
  res.json(receiver);
});

exports.update = asyncHandler(async (req, res) => {
  requireReceiverAccess(req, req.params.id);
  const receiver = await receiverService.update(req.params.id, req.body);
  res.json(receiver);
});

exports.remove = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can delete receivers', 403);
  }
  await receiverService.remove(req.params.id);
  res.status(204).send();
});

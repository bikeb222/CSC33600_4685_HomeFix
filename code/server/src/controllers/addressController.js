const addressService = require('../services/addressService');
const asyncHandler = require('../middleware/asyncHandler');
const addressModel = require('../models/addressModel');
const AppError = require('../utils/AppError');

function requireReceiverAccess(req, receiverId) {
  if (req.user.role === 'manager') {
    return;
  }
  if (req.user.role !== 'receiver' || Number(req.user.receiver_id) !== Number(receiverId)) {
    throw new AppError('You do not have permission to access these addresses', 403);
  }
}

exports.listForReceiver = asyncHandler(async (req, res) => {
  requireReceiverAccess(req, req.params.receiverId);
  const addresses = await addressService.listForReceiver(req.params.receiverId);
  res.json(addresses);
});

exports.create = asyncHandler(async (req, res) => {
  requireReceiverAccess(req, req.params.receiverId);
  const address = await addressService.create(req.params.receiverId, req.body);
  res.status(201).json(address);
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await addressModel.findById(req.params.id);
  if (!existing) {
    throw new AppError('Address not found', 404);
  }
  requireReceiverAccess(req, existing.receiver_id);
  const address = await addressService.update(req.params.id, req.body);
  res.json(address);
});

exports.setDefault = asyncHandler(async (req, res) => {
  requireReceiverAccess(req, req.params.receiverId);
  const address = await addressService.setDefault(req.params.receiverId, req.params.addressId);
  res.json(address);
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await addressModel.findById(req.params.id);
  if (!existing) {
    throw new AppError('Address not found', 404);
  }
  requireReceiverAccess(req, existing.receiver_id);
  await addressService.remove(req.params.id);
  res.status(204).send();
});

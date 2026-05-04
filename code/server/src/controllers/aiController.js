const receiverAssistant = require('../ai/receiverAssistant');
const managerAssistant = require('../ai/managerAssistant');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

function validateChatBody(body = {}) {
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    throw new AppError('message is required', 400);
  }
  if (message.length > 1000) {
    throw new AppError('message must be 1000 characters or fewer', 400);
  }
  const conversation = Array.isArray(body.conversation) ? body.conversation.slice(-8).map((item) => ({
    role: item.role,
    content: typeof item.content === 'string' ? item.content.slice(0, 1200) : ''
  })) : [];
  return { message, conversation };
}

exports.receiverChat = asyncHandler(async (req, res) => {
  if (req.user.role !== 'receiver') {
    throw new AppError('Only receivers can use AI Support', 403);
  }
  const { message, conversation } = validateChatBody(req.body);
  const result = await receiverAssistant.answer({ user: req.user, message, conversation });
  res.json(result);
});

exports.managerChat = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can use AI Assistant', 403);
  }
  const { message, conversation } = validateChatBody(req.body);
  const result = await managerAssistant.answer({ user: req.user, message, conversation });
  res.json(result);
});

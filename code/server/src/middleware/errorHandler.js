const AppError = require('../utils/AppError');

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError || err.isOperational) {
    return res.status(err.statusCode || 400).json({
      message: err.message,
      details: err.details
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate data violates a unique constraint.' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Referenced record does not exist.' });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ message: 'This record is still referenced by other data.' });
  }

  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({ message: 'Data violates a CHECK constraint.' });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
};

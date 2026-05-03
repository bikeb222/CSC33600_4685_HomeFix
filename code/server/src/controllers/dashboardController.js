const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../middleware/asyncHandler');

exports.stats = asyncHandler(async (req, res) => {
  const stats = await dashboardService.stats(req.user);
  res.json(stats);
});

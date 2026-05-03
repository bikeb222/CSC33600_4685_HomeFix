const dashboardModel = require('../models/dashboardModel');

async function stats(user) {
  return dashboardModel.stats(user);
}

module.exports = {
  stats
};

require('dotenv').config();

const app = require('./app');
const { ping } = require('./config/db');

const port = Number(process.env.PORT || 5000);

async function start() {
  await ping();
  app.listen(port, () => {
    console.log(`Homefix API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

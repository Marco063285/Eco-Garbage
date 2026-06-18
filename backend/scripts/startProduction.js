require('dotenv').config();

const { ensureMongoIndexes } = require('./ensureMongoIndexes');

const start = async () => {
  await ensureMongoIndexes();
  const { startServer } = require('../src/server');
  await startServer();
};

start().catch((error) => {
  console.error(`Demarrage production impossible: ${error.message}`);
  console.error(error.stack);
  process.exitCode = 1;
});

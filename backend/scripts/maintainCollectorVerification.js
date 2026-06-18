require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const {
  processCollectorVerificationRenewals,
} = require('../src/services/collectorVerificationService');

const main = async () => {
  await connectDB();
  const result = await processCollectorVerificationRenewals();
  console.log(JSON.stringify(result, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

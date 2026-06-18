require('dotenv').config();
const { restoreBackup } = require('../src/services/backupService');

const args = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...valueParts] = argument.replace(/^--/, '').split('=');
    return [key, valueParts.join('=') || true];
  })
);

restoreBackup({
  manifestPath: args.manifest,
  targetDatabase: args['target-db'],
  allowProductionRestore: args['confirm-production'] === 'true',
})
  .then((result) => {
    console.log(JSON.stringify({ success: true, ...result }, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({
      success: false,
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  });

require('dotenv').config();
const mongoose = require('mongoose');
const {
  createBackup,
  restoreBackup,
} = require('../src/services/backupService');

const main = async () => {
  const uri = process.env.MONGO_URI
    || 'mongodb://127.0.0.1:27017/eco_garbage_db';
  const result = await createBackup({ uri });
  const targetDatabase = `${result.manifest.source_database}_restore_test`;
  let restored;
  let testDatabaseDeleted = false;
  try {
    restored = await restoreBackup({
      manifestPath: result.manifestPath,
      uri,
      targetDatabase,
    });
  } finally {
    const connection = await mongoose.createConnection(uri, {
      dbName: targetDatabase,
    }).asPromise();
    try {
      await connection.db.dropDatabase();
      testDatabaseDeleted = true;
    } finally {
      await connection.close();
    }
  }
  console.log(JSON.stringify({
    success: true,
    backup_id: result.manifest.backup_id,
    restored_database: targetDatabase,
    verified_collections: Object.keys(restored.collections).length,
    test_database_deleted: testDatabaseDeleted,
  }, null, 2));
};

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    message: error.message,
  }, null, 2));
  process.exitCode = 1;
});

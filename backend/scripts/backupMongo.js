require('dotenv').config();
const { createBackup } = require('../src/services/backupService');

createBackup()
  .then((result) => {
    console.log(JSON.stringify({
      success: true,
      backup_id: result.manifest.backup_id,
      database: result.manifest.source_database,
      archive: result.archivePath,
      manifest: result.manifestPath,
      collections: result.manifest.collections,
      retention_deleted: result.retention_deleted,
    }, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({
      success: false,
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  });

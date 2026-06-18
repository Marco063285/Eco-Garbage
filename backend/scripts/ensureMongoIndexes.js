const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config();

const modelsDirectory = path.join(__dirname, '..', 'src', 'models');
for (const filename of fs.readdirSync(modelsDirectory)) {
  if (filename.endsWith('.js')) require(path.join(modelsDirectory, filename));
}

const obsoleteIndexes = {
  PickupRequest: [
    'collector_id_1_status_1_created_at_-1',
    'status_1_collector_id_1',
  ],
  ChatMessage: ['recipient_id_1_is_read_1'],
  Notification: [
    'delivery.push.status_1_delivery.push.next_attempt_at_1',
    'delivery.email.status_1_delivery.email.next_attempt_at_1',
  ],
  User: [
    'collector_profile.location_2dsphere_role_1_is_active_1_collector_profile.is_available_1_collector_profile.verification_status_1',
  ],
  CollectorApplication: ['status_1_submitted_at_1'],
};

const run = async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eco_garbage_db',
    { autoIndex: false, serverSelectionTimeoutMS: 10_000 }
  );
  for (const modelName of mongoose.modelNames().sort()) {
    const model = mongoose.model(modelName);
    await model.createIndexes();
    console.log(`${modelName}: index verifies`);
  }
  if (process.env.MONGO_DROP_OBSOLETE_INDEXES === 'true') {
    for (const [modelName, indexNames] of Object.entries(obsoleteIndexes)) {
      const model = mongoose.model(modelName);
      const existing = new Set(
        (await model.collection.indexes()).map((index) => index.name)
      );
      for (const indexName of indexNames) {
        if (!existing.has(indexName)) continue;
        await model.collection.dropIndex(indexName);
        console.log(`${modelName}: ancien index supprime (${indexName})`);
      }
    }
  }
  await mongoose.disconnect();
};

if (require.main === module) {
  run().catch(async (error) => {
    console.error(`Creation des index impossible: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
}

module.exports = { ensureMongoIndexes: run };

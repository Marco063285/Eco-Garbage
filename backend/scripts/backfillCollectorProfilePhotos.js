const crypto = require('node:crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const CollectorApplication = require('../src/models/CollectorApplication');
const User = require('../src/models/User');
const {
  collectorApplicationDir,
  collectorProfilePhotoDir,
} = require('../src/config/storage');
const {
  deleteStoredFile,
  ENCRYPTION_VERSION,
  readEncryptedFile,
  writeEncryptedFile,
} = require('../src/utils/secureFileStorage');

const backfillCollectorProfilePhotos = async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eco_garbage_db',
    { autoIndex: false, serverSelectionTimeoutMS: 10_000 }
  );

  const applications = await CollectorApplication.find({
    status: 'approved',
    'documents.profile_photo.stored_name': { $exists: true },
  }).sort({ reviewed_at: -1 }).lean();

  let migrated = 0;
  let skipped = 0;
  const processedUsers = new Set();

  for (const application of applications) {
    const userId = application.user_id.toString();
    if (processedUsers.has(userId)) continue;
    processedUsers.add(userId);

    const user = await User.findOne({
      _id: application.user_id,
      role: 'collector',
    }).select('collector_profile.profile_photo').lean();
    if (!user || user.collector_profile?.profile_photo?.stored_name) {
      skipped += 1;
      continue;
    }

    const source = application.documents.profile_photo;
    const { buffer } = await readEncryptedFile({
      directory: collectorApplicationDir,
      storedName: source.stored_name,
      context: 'collector-document',
      migrateLegacy: false,
    });
    const storedName = `${crypto.randomUUID()}.enc`;
    await writeEncryptedFile({
      directory: collectorProfilePhotoDir,
      storedName,
      buffer,
      context: 'collector-profile-photo',
    });

    const result = await User.updateOne(
      {
        _id: application.user_id,
        role: 'collector',
        'collector_profile.profile_photo.stored_name': { $exists: false },
      },
      {
        $set: {
          'collector_profile.profile_photo': {
            stored_name: storedName,
            mime_type: source.mime_type,
            size: buffer.length,
            sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
            encryption_version: ENCRYPTION_VERSION,
            encrypted_at: new Date(),
            verified_at: application.reviewed_at || new Date(),
          },
        },
      }
    );
    if (result.modifiedCount) {
      migrated += 1;
    } else {
      skipped += 1;
      await deleteStoredFile({
        directory: collectorProfilePhotoDir,
        storedName,
      }).catch(() => {});
    }
  }

  console.log(JSON.stringify({ migrated, skipped }, null, 2));
  await mongoose.disconnect();
  return { migrated, skipped };
};

if (require.main === module) {
  backfillCollectorProfilePhotos().catch(async (error) => {
    console.error(`Migration des photos collecteur impossible: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
}

module.exports = { backfillCollectorProfilePhotos };

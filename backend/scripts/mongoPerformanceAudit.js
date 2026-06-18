const mongoose = require('mongoose');
require('dotenv').config();

const PickupRequest = require('../src/models/PickupRequest');
const Notification = require('../src/models/Notification');
const ChatMessage = require('../src/models/ChatMessage');
const Payment = require('../src/models/Payment');

const collectPlanDetails = (node, result = { stages: [], indexes: [] }) => {
  if (!node || typeof node !== 'object') return result;
  if (node.stage) result.stages.push(node.stage);
  if (node.indexName) result.indexes.push(node.indexName);
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') collectPlanDetails(value, result);
  }
  return result;
};

const summarizeExplain = (name, explain) => {
  const execution = explain.executionStats || {};
  const plan = collectPlanDetails(explain.queryPlanner?.winningPlan);
  const returned = execution.nReturned || 0;
  const docsExamined = execution.totalDocsExamined || 0;
  const ratio = docsExamined / Math.max(1, returned);
  return {
    name,
    execution_ms: execution.executionTimeMillis || 0,
    returned,
    keys_examined: execution.totalKeysExamined || 0,
    documents_examined: docsExamined,
    examined_per_result: Math.round(ratio * 100) / 100,
    stages: [...new Set(plan.stages)],
    indexes: [...new Set(plan.indexes)],
    warning: plan.stages.includes('COLLSCAN') || ratio > 25,
  };
};

const run = async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eco_garbage_db',
    {
      autoIndex: false,
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 5,
    }
  );

  const [requestSample, notificationSample, messageSample, paymentSample] = await Promise.all([
    PickupRequest.findOne().select('collector_id').lean(),
    Notification.findOne().select('user_id').lean(),
    ChatMessage.findOne().select('request_id recipient_id').lean(),
    Payment.findOne().select('user_id').lean(),
  ]);

  const queries = [
    [
      'available_pickups',
      PickupRequest.find({ status: 'pending', collector_id: null })
        .sort({ created_at: -1 }).limit(20),
    ],
  ];
  if (requestSample?.collector_id) {
    queries.push([
      'collector_history',
      PickupRequest.find({
        collector_id: requestSample.collector_id,
        is_archived: false,
      }).sort({ created_at: -1 }).limit(20),
    ]);
  }
  if (notificationSample?.user_id) {
    queries.push([
      'notification_inbox',
      Notification.find({ user_id: notificationSample.user_id })
        .sort({ created_at: -1 }).limit(50),
    ]);
  }
  if (messageSample?.request_id) {
    queries.push([
      'chat_history',
      ChatMessage.find({ request_id: messageSample.request_id })
        .sort({ created_at: -1 }).limit(50),
    ]);
    queries.push([
      'chat_mark_read',
      ChatMessage.find({
        request_id: messageSample.request_id,
        recipient_id: messageSample.recipient_id,
        is_read: false,
      }).limit(100),
    ]);
  }
  if (paymentSample?.user_id) {
    queries.push([
      'payment_history',
      Payment.find({ user_id: paymentSample.user_id })
        .sort({ created_at: -1 }).limit(20),
    ]);
  }

  const results = [];
  for (const [name, query] of queries) {
    const explain = await query.explain('executionStats');
    results.push(summarizeExplain(name, explain));
  }
  console.log(JSON.stringify(results, null, 2));
  if (
    process.env.MONGO_AUDIT_STRICT === 'true'
    && results.some((result) => result.warning)
  ) {
    process.exitCode = 1;
  }
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(`Audit MongoDB impossible: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});

module.exports = { collectPlanDetails, summarizeExplain };

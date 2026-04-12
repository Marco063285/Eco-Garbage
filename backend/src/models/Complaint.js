const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupRequest' },
  type: {
    type: String,
    enum: ['missed_pickup', 'incorrect_pricing', 'collector_misconduct', 'service_quality', 'other'],
    default: 'other',
  },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'in_review', 'resolved', 'closed'],
    default: 'open',
  },
  admin_response: String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

module.exports = mongoose.model('Complaint', complaintSchema);

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupRequest', required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: {
    type: String,
    enum: ['mobile_money', 'card', 'bank_transfer', 'cash'],
    default: 'mobile_money',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  transaction_ref: String,
  paid_at: Date,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

module.exports = mongoose.model('Payment', paymentSchema);

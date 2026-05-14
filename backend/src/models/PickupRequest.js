const mongoose = require('mongoose');

const pickupRequestSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collector_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WasteCategory', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'assigned', 'on_way', 'in_progress', 'completed', 'cancelled', 'failed'],
    default: 'pending',
  },
  address: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  collector_location: {
    latitude: Number,
    longitude: Number,
    updated_at: Date,
  },
  quantity_estimate: String,
  quantity_number: { type: Number, default: 1 },
  distance_km: Number,
  notes: String,
  image_url: String,
  proof_url: String,
  scheduled_at: Date,
  collected_at: Date,
  estimated_price: Number,
  final_price: Number,
  service_type: {
    type: String,
    enum: ['immediate', 'scheduled', 'recurring', 'business', 'bulk', 'recyclable'],
    default: 'immediate',
  },
  is_archived: { type: Boolean, default: false },
  archived_at: Date,
  rating_score: Number,
  rating_comment: String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for the most common query patterns
pickupRequestSchema.index({ user_id: 1, is_archived: 1, status: 1, created_at: -1 });
pickupRequestSchema.index({ collector_id: 1, status: 1, created_at: -1 });
pickupRequestSchema.index({ status: 1, collector_id: 1 }); // available requests for collectors
pickupRequestSchema.index({ created_at: -1 });             // admin recent requests sort

module.exports = mongoose.model('PickupRequest', pickupRequestSchema);

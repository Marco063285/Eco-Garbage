const mongoose = require('mongoose');

const collectorProfileSchema = new mongoose.Schema({
  vehicle_type: String,
  vehicle_plate: String,
  service_area: String,
  is_available: { type: Boolean, default: false },
  rating_avg: { type: Number, default: 0 },
  total_collections: { type: Number, default: 0 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },
  last_location_update: Date,
}, { _id: false });

const userSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: String,
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['user', 'collector', 'admin'], default: 'user' },
  is_verified: { type: Boolean, default: false },
  email_verification_token: { type: String, default: null },
  email_verification_expires: { type: Date, default: null },
  password_reset_token: { type: String, default: null },
  password_reset_expires: { type: Date, default: null },
  is_active: { type: Boolean, default: true },
  avatar_url: String,
  address: String,
  collector_profile: collectorProfileSchema,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Create 2dsphere index for geolocation queries
userSchema.index({ 'collector_profile.location': '2dsphere' });

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const wasteCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  icon: String,
  base_price: { type: Number, default: 500 },
  is_hazardous: { type: Boolean, default: false },
  is_recyclable: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

module.exports = mongoose.model('WasteCategory', wasteCategorySchema);

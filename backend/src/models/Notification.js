const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  is_read: { type: Boolean, default: false },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

notificationSchema.index({ user_id: 1, created_at: -1 });  // list sorted
notificationSchema.index({ user_id: 1, is_read: 1 });       // unread count

module.exports = mongoose.model('Notification', notificationSchema);

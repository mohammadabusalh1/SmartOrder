const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient_user_id: {
    type: Number,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  notification_type: {
    type: String,
    required: true,
    enum: ['order_update', 'message', 'promotion', 'system', 'payment']
  },
  related_entity_type: {
    type: String,
    enum: ['order', 'message', 'restaurant', 'payment', null],
    default: null
  },
  related_entity_id: {
    type: Number,
    default: null
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date,
    default: null
  },
  delivery_channels: {
    type: mongoose.Schema.Types.Mixed,
    default: { push: true, email: false, sms: false }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Create indexes for common queries
notificationSchema.index({ recipient_user_id: 1, created_at: -1 });
notificationSchema.index({ is_read: 1 });
notificationSchema.index({ related_entity_type: 1, related_entity_id: 1 });

// Set toJSON option
notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 
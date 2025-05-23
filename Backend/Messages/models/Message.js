const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message_content: {
    type: String,
    required: true
  },
  attachment_url: {
    type: String,
    default: null
  },
  sent_at: {
    type: Date,
    default: Date.now
  },
  read_at: {
    type: Date,
    default: null
  },
  message_type: {
    type: String,
    enum: ['text', 'image', 'file', 'order_update', 'system'],
    default: 'text'
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
messageSchema.index({ conversation_id: 1, sent_at: -1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ read_at: 1 }, { sparse: true });

// Set toJSON option
messageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 
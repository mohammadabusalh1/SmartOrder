const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  action_type: {
    type: String,
    required: [true, 'Action type is required']
  },
  details_before: {
    type: Object,
    required: false
  },
  details_after: {
    type: Object,
    required: false
  },
  message: {
    type: String,
    required: false
  },
  ip_address: {
    type: String,
    required: false
  },
  user_agent: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We'll use our own timestamp field
});

// Virtual for log_id (for compatibility)
auditLogSchema.virtual('log_id').get(function() {
  return this._id;
});

// Set toJSON option to include virtuals
auditLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

// Static method to create a new audit log
auditLogSchema.statics.createLog = async function(logData) {
  return await this.create(logData);
};

// Static method to get all audit logs
auditLogSchema.statics.getAllLogs = async function() {
  return await this.find().sort({ timestamp: -1 });
};

// Static method to get logs by time range
auditLogSchema.statics.getLogsByTimeRange = async function(fromTime, toTime) {
  return await this.find({
    timestamp: {
      $gte: new Date(fromTime),
      $lte: new Date(toTime)
    }
  }).sort({ timestamp: -1 });
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog; 
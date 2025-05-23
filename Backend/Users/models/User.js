const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password_hash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false // Don't return password in queries by default
  },
  phone_number: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function(value) {
        return /^\+[1-9]\d{9,14}$/.test(value);
      },
      message: 'Please provide a valid phone number in format +XXXXXXXXXX'
    }
  },
  user_type: {
    type: String,
    enum: ['customer', 'restaurant_owner', 'admin'],
    default: 'customer',
    required: true
  },
  profile_picture_url: {
    type: String,
    default: null
  },
  email_verified_at: {
    type: Date,
    default: null
  },
  phone_verified_at: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  last_login_at: {
    type: Date,
    default: null
  },
  refresh_token: {
    type: String,
    default: null
  },
  social_provider: String,
  social_id: String,
  password_reset_token: String,
  password_reset_expires: Date,
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
// Pre-save hook to hash password and update timestamps
userSchema.pre('save', async function(next) {
  // Update the updated_at timestamp
  this.updated_at = Date.now();
  
  // Only hash the password if it's modified or new
  if (!this.isModified('password_hash')) return next();
  
  try {
    // Hash the password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password_hash);
  } catch (error) {
    return false;
  }
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  // Token expires after 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

// Allow setting password - for test simplicity
userSchema.virtual('password')
  .set(function(password) {
    this._password = password;
    this.password_hash = password;
  })
  .get(function() {
    return this._password;
  });

// Virtual for user_id (for compatibility)
userSchema.virtual('user_id').get(function() {
  return this._id;
});

// Set toJSON option to include virtuals and hide some fields
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password_hash;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User; 
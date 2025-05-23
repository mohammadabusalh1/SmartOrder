const mongoose = require('mongoose');

// Define OrderStatus enum
const OrderStatusEnum = {
  PENDING: 'pending',
  BIDDING: 'bidding',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

// Define PaymentStatus enum
const PaymentStatusEnum = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CANCELLED: 'cancelled'
};

// Define BidStatus enum
const BidStatusEnum = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

// ===================== OrderItem Schema (Child) =====================
const orderItemSchema = new mongoose.Schema({
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    default: null
  },
  item_name_if_not_menu_item: {
    type: String,
    default: null,
    validate: {
      validator: function(value) {
        // Either menu_item_id or item_name_if_not_menu_item must be provided
        return this.menu_item_id !== null || value !== null;
      },
      message: 'Either menu item ID or custom item name must be provided'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  price_per_item: {
    type: Number,
    required: [true, 'Price per item is required'],
    min: [0, 'Price per item must be non-negative']
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal must be non-negative']
  },
  notes: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Virtual for getting the item name
orderItemSchema.virtual('item_name').get(function() {
  return this.item_name_if_not_menu_item || 'From Menu';
});

// Pre-save middleware to calculate subtotal
orderItemSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('price_per_item')) {
    this.subtotal = this.quantity * this.price_per_item;
  }
  next();
});

// ===================== Payment Schema (Child) =====================
const paymentSchema = new mongoose.Schema({
  customer_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer user ID is required']
  },
  amount_paid: {
    type: Number,
    required: [true, 'Amount paid is required'],
    min: [0, 'Amount paid must be non-negative']
  },
  payment_method_used: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'crypto', 'bank_transfer', 'cash']
  },
  payment_gateway_transaction_id: {
    type: String,
    default: null,
    unique: true,
    sparse: true // Only enforce uniqueness if field exists
  },
  payment_status: {
    type: String,
    enum: Object.values(PaymentStatusEnum),
    default: PaymentStatusEnum.PENDING
  },
  payment_timestamp: {
    type: Date,
    default: null
  },
  refund_amount: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        return value === null || (value >= 0 && value <= this.amount_paid);
      },
      message: 'Refund amount must be non-negative and cannot exceed the amount paid'
    }
  },
  refund_timestamp: {
    type: Date,
    default: null
  },
  refund_reason: {
    type: String,
    default: null
  },
  gateway_response_details: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update payment timestamps
paymentSchema.pre('save', function(next) {
  this.updated_at = Date.now();

  if(this.refund_timestamp > this.payment_timestamp) {
    throw new Error('Refund timestamp cannot be greater than payment timestamp');
  }
  
  // Set payment timestamp if status is changing to COMPLETED
  if (this.isModified('payment_status') && this.payment_status === PaymentStatusEnum.COMPLETED && !this.payment_timestamp) {
    this.payment_timestamp = Date.now();
  }
  
  // Set refund timestamp if refund amount is being set
  if (this.isModified('refund_amount') && this.refund_amount > 0 && !this.refund_timestamp) {
    this.refund_timestamp = Date.now();
  }
  
  next();
});

// ===================== Bid Schema (Child) =====================
const bidSchema = new mongoose.Schema({
  restaurant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required']
  },
  bid_price: {
    type: Number,
    required: [true, 'Bid price is required'],
    min: [0, 'Bid price must be non-negative']
  },
  estimated_delivery_time_minutes: {
    type: Number,
    required: [true, 'Estimated delivery time is required'],
    min: [1, 'Estimated delivery time must be at least 1 minute']
  },
  bid_status: {
    type: String,
    enum: Object.values(BidStatusEnum),
    default: BidStatusEnum.PENDING
  },
  notes_to_customer: {
    type: String,
    default: null
  },
  bid_details_if_custom: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  valid_until: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update bid timestamps
bidSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Set valid_until if not already set (default to 24 hours from creation)
  if (!this.valid_until && this.isNew) {
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);
    this.valid_until = validUntil;
  }
  
  next();
});

// Virtual for estimated delivery time as a formatted string
bidSchema.virtual('estimated_delivery_time_formatted').get(function() {
  const hours = Math.floor(this.estimated_delivery_time_minutes / 60);
  const minutes = this.estimated_delivery_time_minutes % 60;
  
  let formatted = '';
  if (hours > 0) {
    formatted += `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) formatted += ' and ';
  }
  
  if (minutes > 0 || hours === 0) {
    formatted += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  return formatted;
});

// Method to check if the bid is still valid
bidSchema.methods.isValidBid = function() {
  // Check if bid is in valid status
  if (this.bid_status !== BidStatusEnum.PENDING) return false;
  
  // Check if bid hasn't expired
  if (this.valid_until && new Date() > this.valid_until) {
    // Automatically update status to expired if checked and found to be expired
    this.bid_status = BidStatusEnum.EXPIRED;
    return false;
  }
  
  return true;
};

// ===================== Address Schema (Child) =====================
const addressSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  address_label: {
    type: String,
    default: null,
    trim: true
  },
  contact_person_name: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true
  },
  contact_person_phone: {
    type: String,
    required: [true, 'Contact person phone is required'],
    trim: true,
    validate: {
      validator: function(value) {
        return /^\+[1-9]\d{9,14}$/.test(value);
      },
      message: 'Please provide a valid phone number in format +XXXXXXXXXX'
    }
  },
  address_line1: {
    type: String,
    required: [true, 'Address line 1 is required'],
    trim: true
  },
  address_line2: {
    type: String,
    default: null,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  postal_code: {
    type: String,
    default: null,
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  latitude: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        return value === null || (value >= -90 && value <= 90);
      },
      message: 'Latitude must be between -90 and 90'
    }
  },
  longitude: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        return value === null || (value >= -180 && value <= 180);
      },
      message: 'Longitude must be between -180 and 180'
    }
  },
  address_type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  is_default_for_user: {
    type: Boolean,
    default: false
  },
  delivery_instructions: {
    type: String,
    default: null
  }
});

// Virtual for full address string
addressSchema.virtual('full_address').get(function() {
  let fullAddress = this.address_line1;
  if (this.address_line2) fullAddress += ', ' + this.address_line2;
  fullAddress += ', ' + this.city;
  if (this.postal_code) fullAddress += ', ' + this.postal_code;
  fullAddress += ', ' + this.country;
  return fullAddress;
});

// ===================== Main Order Schema =====================
const orderSchema = new mongoose.Schema({
  customer_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer user ID is required']
  },
  restaurant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    default: null
  },
  delivery_address: {
    type: addressSchema,
    required: [true, 'Delivery address is required']
  },
  order_description: {
    type: String,
    required: [true, 'Order description is required']
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  budget_min: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        return value === null || value >= 0;
      },
      message: 'Minimum budget must be a positive number'
    }
  },
  budget_max: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        return value === null || value >= 0;
      },
      message: 'Maximum budget must be a positive number'
    }
  },
  desired_delivery_time: {
    type: Date,
    required: [true, 'Desired delivery time is required']
  },
  actual_delivery_time: {
    type: Date,
    default: null
  },
  order_status: {
    type: String,
    enum: Object.values(OrderStatusEnum),
    default: OrderStatusEnum.PENDING,
    required: true
  },
  cancellation_reason: {
    type: String,
    default: null
  },
  cancellation_timestamp: {
    type: Date,
    default: null
  },
  special_instructions: {
    type: String,
    default: null
  },
  total_amount_before_promo: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        return value === null || value >= 0;
      },
      message: 'Total amount before promo must be a positive number'
    }
  },
  promo_code_applied_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion',
    default: null
  },
  discount_amount: {
    type: Number,
    default: 0,
    validate: {
      validator: function(value) {
        return value >= 0;
      },
      message: 'Discount amount must be a positive number'
    }
  },
  final_total_amount: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        return value === null || value >= 0;
      },
      message: 'Final total amount must be a positive number'
    }
  },
  bidding_ends_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  // Child collections
  order_items: [orderItemSchema],
  payment: {
    type: paymentSchema,
    default: null
  },
  bids: [bidSchema]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Middleware to update timestamps
orderSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Set order status to BIDDING when no restaurant_id is provided
  if (this.isNew && !this.restaurant_id && this.order_status === OrderStatusEnum.PENDING) {
    this.order_status = OrderStatusEnum.BIDDING;
  }
  
  // Calculate total amount from order items if items exist
  if (this.order_items && this.order_items.length > 0) {
    const totalAmount = this.order_items.reduce((sum, item) => sum + item.subtotal, 0);
    this.total_amount_before_promo = totalAmount;
    
    // If no promotion, set final amount equal to total
    if (!this.promo_code_applied_id) {
      this.final_total_amount = totalAmount;
    } else {
      // With promotion, apply discount
      this.final_total_amount = totalAmount - this.discount_amount;
    }
  }
  
  next();
});

// Virtual for order_id (for compatibility)
orderSchema.virtual('order_id').get(function() {
  return this._id;
});

// Add index for customer_user_id for faster lookup
orderSchema.index({ customer_user_id: 1 });
// Add index for restaurant_id for faster lookup
orderSchema.index({ restaurant_id: 1 });
// Add index for order_status for faster filtering
orderSchema.index({ order_status: 1 });
// Add index for created_at for sorting by date
orderSchema.index({ created_at: -1 });

// Methods for order management
orderSchema.methods.addOrderItem = function(itemData) {
  // Create new order item
  const newItem = {
    ...itemData,
    subtotal: itemData.quantity * itemData.price_per_item
  };
  
  // Add to order items array
  this.order_items.push(newItem);
  
  // Recalculate totals (handled by pre-save middleware)
  return this;
};

orderSchema.methods.removeOrderItem = function(itemId) {
  // Find the item index
  const itemIndex = this.order_items.findIndex(item => item._id.toString() === itemId.toString());
  
  if (itemIndex === -1) {
    throw new Error('Order item not found');
  }
  
  // Remove the item
  this.order_items.splice(itemIndex, 1);
  
  // Recalculate totals (handled by pre-save middleware)
  return this;
};

orderSchema.methods.addBid = function(bidData) {
  // Create new bid
  this.bids.push(bidData);
  return this;
};

orderSchema.methods.acceptBid = function(bidId) {
  // Find the bid
  const bid = this.bids.id(bidId);
  
  if (!bid) {
    throw new Error('Bid not found');
  }
  
  if (!bid.isValidBid()) {
    throw new Error('Bid is no longer valid');
  }
  
  // Update bid status
  bid.bid_status = BidStatusEnum.ACCEPTED;
  
  // Update order with restaurant and price from bid
  this.restaurant_id = bid.restaurant_id;
  this.order_status = OrderStatusEnum.ACCEPTED;
  this.final_total_amount = bid.bid_price;
  
  // Reject all other bids
  this.bids.forEach(otherBid => {
    if (otherBid._id.toString() !== bidId.toString() && otherBid.bid_status === BidStatusEnum.PENDING) {
      otherBid.bid_status = BidStatusEnum.REJECTED;
    }
  });
  
  return this;
};

orderSchema.methods.setPayment = function(paymentData) {
  this.payment = paymentData;
  return this;
};

orderSchema.methods.cancelOrder = function(reason) {
  this.order_status = OrderStatusEnum.CANCELLED;
  this.cancellation_reason = reason || 'Cancelled by user';
  this.cancellation_timestamp = new Date();
  this.bids.forEach(bid => {
    bid.bid_status = BidStatusEnum.REJECTED;
  });
  return this;
};

orderSchema.methods.markDelivered = function(deliveryTime = null) {
  this.order_status = OrderStatusEnum.DELIVERED;
  this.actual_delivery_time = deliveryTime || new Date();
  return this;
};

// Set toJSON option
orderSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = {
  Order,
  OrderStatusEnum,
  PaymentStatusEnum,
  BidStatusEnum
}; 
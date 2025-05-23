const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const operatingHoursSchema = new Schema({
  day: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  open: {
    type: String
  },
  close: {
    type: String
  },
}, { _id: false });

const reviewSchema = new Schema({
  order_id: {
    type: Number,
    required: true,
    unique: true
  },
  customer_user_id: {
    type: Number
  },
  rating_service_experience: {
    type: Number
  },
  comment: {
    type: String
  },
  review_images_urls: {
    type: [String]
  },
  restaurant_reply_text: {
    type: String
  },
  restaurant_reply_timestamp: {
    type: Date
  },
  is_anonymous: {
    type: Boolean
  },
  created_at: {
    type: Date
  },
  updated_at: {
    type: Date
  }
});

const polygonCoordinatesSchema = new Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  }
});


const serviceAreaSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  city: {
    type: String,
    required: true
  },
  polygon_coordinates: {
    type: [polygonCoordinatesSchema]
  },
  delivery_fee: {
    type: Number
  },
  min_order_value_for_delivery: {
    type: Number
  },
  is_active: {
    type: Boolean,
    default: true
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

// Define the categorySchema first
const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  sort_order: {
    type: Number
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

// Add the subcategories field after schema is defined
categorySchema.add({
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }]
});

const menuItemSchema = new Schema({
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  name: {
    type: String
  },
  description: {
    type: String
  },
  price: {
    type: Number
  },
  image_url: {
    type: String
  },
  is_available: {
    type: Boolean
  },
  preparation_time_minutes: {
    type: Number
  },
  calories: {
    type: Number
  },
  dietary_tags: {
    type: [String]
  },
  portion_size: {
    type: String
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

const restaurantSchema = new Schema({
  owner_user_id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  address_line1: {
    type: String,
    required: true,
    trim: true
  },
  address_line2: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  postal_code: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  phone_number: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  website_url: {
    type: String,
    trim: true
  },
  logo_url: {
    type: String,
    trim: true
  },
  cover_image_url: {
    type: String,
    trim: true
  },
  operating_hours: [operatingHoursSchema],
  reviews: [reviewSchema],
  service_areas: [serviceAreaSchema],
  menu_items: [menuItemSchema],
  average_rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  total_ratings: {
    type: Number,
    default: 0,
    min: 0
  },
  bank_account_details: {
    type: String,
    trim: true
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

// Update the updatedAt timestamp before saving
restaurantSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Create models
const Category = mongoose.model('Category', categorySchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = { Restaurant, Category }; 
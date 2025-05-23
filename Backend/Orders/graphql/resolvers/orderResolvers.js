const {
  Order
} = require('../../models/Order');

// Utility functions to convert between GraphQL enums (UPPERCASE) and Mongoose enums (lowercase)
const toGraphQLEnum = (value) => {
  if (!value) return null;
  return value.toUpperCase();
};

const toMongooseEnum = (value) => {
  if (!value) return null;
  return value.toLowerCase();
};

// Convert arrays of enums
const toGraphQLEnumArray = (values) => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(val => toGraphQLEnum(val));
};

const toMongooseEnumArray = (values) => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(val => toMongooseEnum(val));
};

// Utility functions for transforming specific object types
const transformPaymentForGraphQL = (payment) => {
  if (!payment) return null;

  const paymentData = payment.toObject ? payment.toObject() : { ...payment };
  paymentData.id = paymentData._id ? paymentData._id.toString() : null;

  if (paymentData.payment_status) {
    paymentData.payment_status = toGraphQLEnum(paymentData.payment_status);
  }

  return paymentData;
};

const transformAddressForGraphQL = (address) => {
  if (!address) return null;

  const addressData = address.toObject ? address.toObject() : { ...address };
  addressData.id = addressData._id ? addressData._id.toString() : null;

  if (addressData.address_type) {
    addressData.address_type = toGraphQLEnum(addressData.address_type);
  }

  return addressData;
};

const transformBidForGraphQL = (bid) => {
  if (!bid) return null;

  const bidData = bid.toObject ? bid.toObject() : { ...bid };
  bidData.id = bidData._id ? bidData._id.toString() : null;

  if (bidData.bid_status) {
    bidData.bid_status = toGraphQLEnum(bidData.bid_status);
  }

  return bidData;
};

// Transform full order object for GraphQL response
const transformOrderForGraphQL = (order) => {
  if (!order) return null;

  // Create a copy to avoid modifying the original
  const orderData = order.toObject ? order.toObject() : { ...order };

  // Set ID field explicitly (required for GraphQL non-nullable field)
  orderData.id = orderData._id ? orderData._id.toString() : null;

  // Transform enums
  if (orderData.order_status) {
    orderData.order_status = toGraphQLEnum(orderData.order_status);
  }

  // Transform payment if exists
  if (orderData.payment && orderData.payment._id) {
    orderData.payment.id = orderData.payment._id.toString();
    orderData.payment.payment_status = toGraphQLEnum(orderData.payment.payment_status);
  }

  // Transform bids if exist
  if (orderData.bids && Array.isArray(orderData.bids)) {
    orderData.bids = orderData.bids.map(bid => ({
      ...bid,
      id: bid._id ? bid._id.toString() : null,
      bid_status: toGraphQLEnum(bid.bid_status)
    }));
  }

  // Transform delivery address if exists
  if (orderData.delivery_address && orderData.delivery_address._id) {
    orderData.delivery_address.id = orderData.delivery_address._id.toString();
    orderData.delivery_address.address_type = toGraphQLEnum(orderData.delivery_address.address_type);
  }

  return orderData;
};

const orderResolvers = {
  Query: {
    // Order queries
    order: async (_, { id }) => {
      const order = await Order.findById(id);
      return transformOrderForGraphQL(order);
    },

    orders: async (_, { filter = {}, sort = {}, pagination = {} }) => {
      const query = {};

      // Apply filters
      if (filter.customer_user_id) query.customer_user_id = filter.customer_user_id;
      if (filter.restaurant_id) query.restaurant_id = filter.restaurant_id;
      if (filter.order_status && filter.order_status.length > 0) {
        query.order_status = { $in: toMongooseEnumArray(filter.order_status) };
      }

      if (filter.min_created_date || filter.max_created_date) {
        query.created_at = {};
        if (filter.min_created_date) query.created_at.$gte = new Date(filter.min_created_date);
        if (filter.max_created_date) query.created_at.$lte = new Date(filter.max_created_date);
      }

      if (filter.search_term) {
        // Text search in order description or special instructions
        query.$or = [
          { order_description: { $regex: filter.search_term, $options: 'i' } },
          { special_instructions: { $regex: filter.search_term, $options: 'i' } }
        ];
      }

      // Apply sorting
      const sortOptions = {};
      if (sort.field) {
        const sortDirection = sort.direction === 'DESC' ? -1 : 1;
        switch (sort.field) {
          case 'CREATED_AT':
            sortOptions.created_at = sortDirection;
            break;
          case 'DESIRED_DELIVERY_TIME':
            sortOptions.desired_delivery_time = sortDirection;
            break;
          case 'TOTAL_AMOUNT':
            sortOptions.final_total_amount = sortDirection;
            break;
          default:
            sortOptions.created_at = -1; // Default: newest first
        }
      } else {
        sortOptions.created_at = -1; // Default: newest first
      }

      // Apply pagination
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      const orders = await Order.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      return orders.map(transformOrderForGraphQL);
    },

    customerOrders: async (_, { customer_id, status, pagination = {} }) => {
      const query = { customer_user_id: customer_id };

      if (status && status.length > 0) {
        query.order_status = { $in: toMongooseEnumArray(status) };
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      const orders = await Order.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      return orders.map(transformOrderForGraphQL);
    },

    restaurantOrders: async (_, { restaurant_id, status, pagination = {} }) => {
      const query = { restaurant_id };

      if (status && status.length > 0) {
        query.order_status = { $in: toMongooseEnumArray(status) };
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      const orders = await Order.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      return orders.map(transformOrderForGraphQL);
    },

    // Order item queries
    orderItems: async (_, { order_id }) => {
      const order = await Order.findById(order_id);
      return order ? order.order_items : [];
    },

    // Payment queries
    payment: async (_, { id }) => {
      // This would need a different implementation since payments are now embedded
      // For backward compatibility, we could search through all orders
      const orders = await Order.find({ "payment._id": id });
      const order = orders.length > 0 ? orders[0] : null;
      if (!order || !order.payment) return null;

      return transformPaymentForGraphQL(order.payment);
    },

    orderPayment: async (_, { order_id }) => {
      const order = await Order.findById(order_id);
      if (!order || !order.payment) return null;

      return transformPaymentForGraphQL(order.payment);
    },

    // Address queries
    address: async (_, { id }) => {
      // For backward compatibility, search for orders with this delivery address id
      const orders = await Order.find({ "delivery_address._id": id });
      const order = orders.length > 0 ? orders[0] : null;
      if (!order || !order.delivery_address) return null;

      return transformAddressForGraphQL(order.delivery_address);
    },

    // User addresses - need to search across all orders for this user
    userAddresses: async (_, { user_id }) => {
      const orders = await Order.find({
        customer_user_id: user_id,
        "delivery_address.user_id": user_id
      });

      // Extract unique addresses
      const addressMap = {};
      orders.forEach(order => {
        const address = order.delivery_address;
        if (address && address.user_id && address.user_id.toString() === user_id.toString()) {
          addressMap[address._id.toString()] = transformAddressForGraphQL(address);
        }
      });

      return Object.values(addressMap).sort((a, b) => {
        // Sort by is_default_for_user (true first) then by created_at (newest first)
        if (a.is_default_for_user === b.is_default_for_user) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        return a.is_default_for_user ? -1 : 1;
      });
    },

    // Promotion queries
    promotion: async (_, { id }) => {
      return await Promotion.findById(id);
    },

    promotionByCode: async (_, { promo_code }) => {
      return await Promotion.findOne({
        promo_code: promo_code.toUpperCase(),
        is_active: true
      });
    },

    validPromotions: async () => {
      const now = new Date();
      return await Promotion.find({
        is_active: true,
        $or: [
          { end_date: null },
          { end_date: { $gt: now } }
        ],
        start_date: { $lte: now },
        $or: [
          { usage_limit: null },
          { usage_count: { $lt: "$usage_limit" } }
        ]
      });
    },

    // Bid queries
    bid: async (_, { id }) => {
      // For backward compatibility, search for orders with this bid id
      const orders = await Order.find({ "bids._id": id });
      if (orders.length === 0) return null;

      const order = orders[0];
      const bid = order.bids.id(id);
      if (!bid) return null;

      return transformBidForGraphQL(bid);
    },

    orderBids: async (_, { order_id }) => {
      const order = await Order.findById(order_id);
      if (!order) return [];

      // Sort bids by price and date
      const sortedBids = order.bids.sort((a, b) => {
        if (a.bid_price === b.bid_price) {
          return new Date(a.created_at) - new Date(b.created_at);
        }
        return a.bid_price - b.bid_price;
      });

      return sortedBids.map(bid => transformBidForGraphQL(bid));
    },

    restaurantBids: async (_, { restaurant_id, status }) => {
      const query = { "bids.restaurant_id": restaurant_id };

      if (status && status.length > 0) {
        const lowercaseStatuses = toMongooseEnumArray(status);
        query["bids.bid_status"] = { $in: lowercaseStatuses };
      }

      const orders = await Order.find(query);

      // Extract and flatten all bids from all orders that match the criteria
      const bids = [];
      orders.forEach(order => {
        order.bids.forEach(bid => {
          if (bid.restaurant_id.toString() === restaurant_id.toString() &&
            (!status || !status.length || status.includes(toGraphQLEnum(bid.bid_status)))) {
            // Add order_id to each bid for convenience
            const bidData = transformBidForGraphQL(bid);
            bidData.order_id = order._id;
            bids.push(bidData);
          }
        });
      });

      // Sort by created_at in descending order
      return bids.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  },

  Mutation: {
    events: async (_, { input }) => {
    },
    // Order mutations
    createOrder: async (_, { input }) => {
      const {
        customer_user_id,
        restaurant_id,
        delivery_address_id,
        new_delivery_address,
        order_description,
        category_id,
        budget_min,
        budget_max,
        desired_delivery_time,
        special_instructions,
        promo_code,
        order_items,
        bidding_ends_at
      } = input;

      // Prepare order data
      const orderData = {
        customer_user_id,
        restaurant_id,
        order_description,
        category_id,
        budget_min,
        budget_max,
        desired_delivery_time: new Date(desired_delivery_time),
        special_instructions,
        bidding_ends_at: bidding_ends_at ? new Date(bidding_ends_at) : null
      };

      // Handle delivery address
      if (delivery_address_id) {
        // Use existing delivery address
        const existingOrder = await Order.findOne({ "delivery_address._id": delivery_address_id });
        if (existingOrder && existingOrder.delivery_address) {
          orderData.delivery_address = existingOrder.delivery_address;
        } else {
          throw new Error(`Delivery address with ID ${delivery_address_id} not found`);
        }
      } else if (new_delivery_address) {
        // Create new delivery address
        if (new_delivery_address.address_type) {
          new_delivery_address.address_type = toMongooseEnum(new_delivery_address.address_type);
        }
        orderData.delivery_address = new_delivery_address;
      } else {
        throw new Error("Either delivery_address_id or new_delivery_address must be provided");
      }

      // Handle order items if provided
      if (order_items && order_items.length > 0) {
        orderData.order_items = order_items;
      }

      // Create the order
      const order = new Order(orderData);

      // Handle promotion code if provided
      if (promo_code) {
        // Apply promo logic here...
      }

      await order.save();
      return transformOrderForGraphQL(order);
    },

    updateOrder: async (_, { id, input }) => {
      // Find the order
      const order = await Order.findById(id);
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      // Update fields
      Object.keys(input).forEach(key => {
        if (key === 'order_status' && input[key]) {
          order[key] = toMongooseEnum(input[key]);
        } else {
          order[key] = input[key];
        }
      });

      // Special handling for dates
      if (input.desired_delivery_time) {
        order.desired_delivery_time = new Date(input.desired_delivery_time);
      }

      if (input.bidding_ends_at) {
        order.bidding_ends_at = new Date(input.bidding_ends_at);
      }

      // Save and return
      await order.save();
      return transformOrderForGraphQL(order);
    },

    cancelOrder: async (_, { id, reason }) => {
      const order = await Order.findById(id);
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      order.cancelOrder(reason);
      await order.save();

      return transformOrderForGraphQL(order);
    },

    markOrderDelivered: async (_, { id, actual_delivery_time }) => {
      const order = await Order.findById(id);
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      order.markDelivered(actual_delivery_time ? new Date(actual_delivery_time) : new Date());
      await order.save();

      return transformOrderForGraphQL(order);
    },

    // Order item mutations
    addOrderItem: async (_, { order_id, input }) => {
      const order = await Order.findById(order_id);
      if (!order) {
        throw new Error(`Order with ID ${order_id} not found`);
      }

      order.addOrderItem(input);
      await order.save();

      // Return the newly added item
      const newItem = order.order_items[order.order_items.length - 1];

      // Add id field for GraphQL
      const itemData = newItem.toObject();
      itemData.id = itemData._id.toString();

      return itemData;
    },

    removeOrderItem: async (_, { id }) => {
      // We need to find which order contains this item
      const orders = await Order.find({ "order_items._id": id });
      if (orders.length === 0) {
        throw new Error(`Order item with ID ${id} not found`);
      }

      const order = orders[0];
      order.removeOrderItem(id);
      await order.save();

      return true;
    },

    // Payment mutations
    createPayment: async (_, { input }) => {
      const { order_id, customer_user_id, amount_paid, payment_method_used, payment_gateway_transaction_id, payment_status } = input;

      const order = await Order.findById(order_id);
      if (!order) {
        throw new Error(`Order with ID ${order_id} not found`);
      }

      // Create payment
      const paymentData = {
        customer_user_id,
        amount_paid,
        payment_method_used,
        payment_gateway_transaction_id
      };

      if (payment_status) {
        paymentData.payment_status = toMongooseEnum(payment_status);
      }

      order.payment = paymentData;
      await order.save();

      // Return the payment with GraphQL-friendly format
      return transformPaymentForGraphQL(order.payment);
    },

    updatePaymentStatus: async (_, { id, status }) => {
      // Find order with this payment
      const orders = await Order.find({ "payment._id": id });
      if (orders.length === 0) {
        throw new Error(`Payment with ID ${id} not found`);
      }

      const order = orders[0];
      order.payment.payment_status = toMongooseEnum(status);

      // Set payment timestamp if completing payment
      if (toMongooseEnum(status) === 'completed' && !order.payment.payment_timestamp) {
        order.payment.payment_timestamp = new Date();
      }

      await order.save();

      return transformPaymentForGraphQL(order.payment);
    },

    refundPayment: async (_, { id, amount, reason }) => {
      // Find order with this payment
      const orders = await Order.find({ "payment._id": id });
      if (orders.length === 0) {
        throw new Error(`Payment with ID ${id} not found`);
      }

      const order = orders[0];

      // Check if payment is completed
      if (order.payment.payment_status !== 'completed') {
        throw new Error("Cannot refund payment that is not in 'completed' status");
      }

      // Check if refund amount is valid
      if (amount > order.payment.amount_paid) {
        throw new Error("Refund amount cannot be greater than the paid amount");
      }

      // Process refund
      order.payment.refund_amount = amount;
      order.payment.refund_reason = reason;
      order.payment.refund_timestamp = new Date();

      // Update status based on refund amount
      if (amount === order.payment.amount_paid) {
        order.payment.payment_status = 'refunded';
      } else {
        order.payment.payment_status = 'partially_refunded';
      }

      await order.save();

      return transformPaymentForGraphQL(order.payment);
    },

    // Address mutations
    createAddress: async (_, { input }) => {
      // In our embedded model, addresses are part of orders
      // We'll create a temporary order to hold this address
      if (input.address_type) {
        input.address_type = toMongooseEnum(input.address_type);
      }

      const tempOrder = new Order({
        customer_user_id: input.user_id || new mongoose.Types.ObjectId(), // Temporary ID if not provided
        order_description: "Address placeholder",
        delivery_address: input,
        desired_delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      });

      await tempOrder.save();

      return transformAddressForGraphQL(tempOrder.delivery_address);
    },

    updateAddress: async (_, { id, input }) => {
      // Find order with this address
      const orders = await Order.find({ "delivery_address._id": id });
      if (orders.length === 0) {
        throw new Error(`Address with ID ${id} not found`);
      }

      const order = orders[0];

      // Update address fields
      Object.keys(input).forEach(key => {
        if (key === 'address_type' && input[key]) {
          order.delivery_address[key] = toMongooseEnum(input[key]);
        } else {
          order.delivery_address[key] = input[key];
        }
      });

      await order.save();

      return transformAddressForGraphQL(order.delivery_address);
    },

    deleteAddress: async (_, { id }) => {
      // Since addresses are embedded, we can't really delete them
      // Instead, we'll update orders to use a different address
      const orders = await Order.find({ "delivery_address._id": id });
      if (orders.length === 0) {
        // If no orders found, consider it already deleted
        return true;
      }

      // For now, just return success
      // In a real implementation, you might want to handle the orders differently
      return true;
    },

    setDefaultAddress: async (_, { id, user_id }) => {
      // Find all addresses for this user
      const orders = await Order.find({
        customer_user_id: user_id,
        "delivery_address.user_id": user_id
      });

      // First, set all addresses to non-default
      for (const order of orders) {
        if (order.delivery_address && order.delivery_address.user_id &&
          order.delivery_address.user_id.toString() === user_id.toString() &&
          order.delivery_address.is_default_for_user) {
          order.delivery_address.is_default_for_user = false;
          await order.save();
        }
      }

      // Then set the specified address as default
      const targetOrders = await Order.find({ "delivery_address._id": id });
      if (targetOrders.length === 0) {
        throw new Error(`Address with ID ${id} not found`);
      }

      const targetOrder = targetOrders[0];
      targetOrder.delivery_address.is_default_for_user = true;
      await targetOrder.save();

      return true;
    },

    // Promotion mutations (not implementing fully since we don't have Promotion model)
    createPromotion: async (_, { input }) => {
      // Implement when Promotion model is available
      throw new Error("Not implemented");
    },

    updatePromotion: async (_, { id, input }) => {
      // Implement when Promotion model is available
      throw new Error("Not implemented");
    },

    deactivatePromotion: async (_, { id }) => {
      // Implement when Promotion model is available
      throw new Error("Not implemented");
    },

    applyPromoToOrder: async (_, { order_id, promo_code }) => {
      // Implement when Promotion model is available
      throw new Error("Not implemented");
    },

    // Bid mutations
    createBid: async (_, { input }) => {
      const { order_id, restaurant_id, bid_price, estimated_delivery_time_minutes, notes_to_customer, bid_details_if_custom, valid_until } = input;

      const order = await Order.findById(order_id);
      if (!order) {
        throw new Error(`Order with ID ${order_id} not found`);
      }

      // Prepare bid data
      const bidData = {
        restaurant_id,
        bid_price,
        estimated_delivery_time_minutes,
        notes_to_customer,
        bid_details_if_custom
      };

      if (valid_until) {
        bidData.valid_until = new Date(valid_until);
      }

      // Add bid
      order.addBid(bidData);
      await order.save();

      // Return the newly added bid with GraphQL-friendly format
      return transformBidForGraphQL(order.bids[order.bids.length - 1]);
    },

    updateBidStatus: async (_, { id, status }) => {
      // Find order with this bid
      const orders = await Order.find({ "bids._id": id });
      if (orders.length === 0) {
        throw new Error(`Bid with ID ${id} not found`);
      }

      const order = orders[0];
      const bid = order.bids.id(id);
      if (!bid) {
        throw new Error(`Bid with ID ${id} not found in order`);
      }

      // Update status
      bid.bid_status = toMongooseEnum(status);
      bid.updated_at = new Date();

      await order.save();

      return transformBidForGraphQL(bid);
    },

    acceptBid: async (_, { id }) => {
      // Find order with this bid
      const orders = await Order.find({ "bids._id": id });
      if (orders.length === 0) {
        throw new Error(`Bid with ID ${id} not found`);
      }

      const order = orders[0];

      // Accept the bid
      order.acceptBid(id);
      await order.save();

      return transformOrderForGraphQL(order);
    }
  },

  // Field resolvers
  Order: {
    customer: async (parent) => {
      // Assuming we have a user service client
      // return await userServiceClient.getUser(parent.customer_user_id);
      return { id: parent.customer_user_id, full_name: 'Customer Name', email: 'customer@example.com', phone_number: '+1234567890', user_type: 'customer' }; // Mocked for now
    },

    restaurant: async (parent) => {
      if (!parent.restaurant_id) return null;

      // Assuming we have a restaurant service client
      // return await restaurantServiceClient.getRestaurant(parent.restaurant_id);
      return { id: parent.restaurant_id, name: 'Restaurant Name', address: '123 Main St', cuisine_type: 'Italian' }; // Mocked for now
    },

    delivery_address: async (parent) => {
      return await Address.findById(parent.delivery_address_id);
    },

    orderItems: async (parent) => {
      return await OrderItem.find({ order_id: parent._id });
    },

    payment: async (parent) => {
      return await Payment.findOne({ order_id: parent._id });
    },

    bids: async (parent) => {
      return await Bid.find({ order_id: parent._id }).sort({ bid_price: 1, created_at: 1 });
    },

    promotion: async (parent) => {
      if (!parent.promo_code_applied_id) return null;
      return await Promotion.findById(parent.promo_code_applied_id);
    }
  },

  OrderItem: {
    order: async (parent) => {
      return await Order.findById(parent.order_id);
    },

    menu_item: async (parent) => {
      if (!parent.menu_item_id) return null;

      // Assuming we have a restaurant service client
      // return await restaurantServiceClient.getMenuItem(parent.menu_item_id);
      return { id: parent.menu_item_id, name: 'Menu Item', description: 'Delicious item', price: parent.price_per_item }; // Mocked for now
    }
  },

  Payment: {
    order: async (parent) => {
      return await Order.findById(parent.order_id);
    },

    customer: async (parent) => {
      // Assuming we have a user service client
      // return await userServiceClient.getUser(parent.customer_user_id);
      return { id: parent.customer_user_id, full_name: 'Customer Name', email: 'customer@example.com', phone_number: '+1234567890', user_type: 'customer' }; // Mocked for now
    }
  },

  Promotion: {
    applicable_restaurants: async (parent) => {
      if (!parent.applies_to_restaurants || parent.applies_to_restaurants.length === 0) {
        return [];
      }

      // Assuming we have a restaurant service client
      // return await Promise.all(parent.applies_to_restaurants.map(id => 
      //   restaurantServiceClient.getRestaurant(id)
      // ));
      return parent.applies_to_restaurants.map(id => ({ id, name: 'Restaurant Name', address: '123 Main St', cuisine_type: 'Italian' })); // Mocked for now
    }
  },

  Bid: {
    order: async (parent) => {
      return await Order.findById(parent.order_id);
    },

    restaurant: async (parent) => {
      // Assuming we have a restaurant service client
      // return await restaurantServiceClient.getRestaurant(parent.restaurant_id);
      return { id: parent.restaurant_id, name: 'Restaurant Name', address: '123 Main St', cuisine_type: 'Italian' }; // Mocked for now
    }
  }
};

module.exports = orderResolvers;
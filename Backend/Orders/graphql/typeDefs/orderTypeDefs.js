const { gql } = require('apollo-server-express');

const orderTypeDefs = gql`
  enum OrderStatus {
    PENDING
    BIDDING
    ACCEPTED
    PREPARING
    READY_FOR_PICKUP
    OUT_FOR_DELIVERY
    DELIVERED
    CANCELLED
    COMPLETED
  }

  enum PaymentStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    REFUNDED
    PARTIALLY_REFUNDED
    CANCELLED
  }

  enum AddressType {
    HOME
    WORK
    OTHER
  }

  enum BidStatus {
    PENDING
    ACCEPTED
    REJECTED
    EXPIRED
    CANCELLED
  }

  type Address {
    id: ID!
    user_id: ID
    address_label: String
    contact_person_name: String!
    contact_person_phone: String!
    address_line1: String!
    address_line2: String
    city: String!
    postal_code: String
    country: String!
    latitude: Float
    longitude: Float
    address_type: AddressType!
    is_default_for_user: Boolean!
    delivery_instructions: String
    full_address: String!
    created_at: String!
    updated_at: String!
  }

  type Order {
    id: ID!
    customer_user_id: ID!
    restaurant_id: ID
    order_description: String!
    category_id: ID
    budget_min: Float
    budget_max: Float
    desired_delivery_time: String!
    actual_delivery_time: String
    order_status: OrderStatus!
    cancellation_reason: String
    cancellation_timestamp: String
    special_instructions: String
    total_amount_before_promo: Float
    promo_code_applied_id: ID
    discount_amount: Float!
    final_total_amount: Float
    bidding_ends_at: String
    created_at: String!
    updated_at: String!
    
    # Relationships
    customer: User
    restaurant: Restaurant
    delivery_address: Address
    orderItems: [OrderItem!]
    payment: Payment
    bids: [Bid!]
    promotion: Promotion
  }

  type OrderItem {
    id: ID!
    order_id: ID!
    menu_item_id: ID
    item_name_if_not_menu_item: String
    quantity: Int!
    price_per_item: Float!
    subtotal: Float!
    notes: String
    created_at: String!
    item_name: String!
    
    # Relationships
    order: Order!
    menu_item: MenuItem
  }

  type Payment {
    id: ID!
    order_id: ID!
    customer_user_id: ID!
    amount_paid: Float!
    payment_method_used: String!
    payment_gateway_transaction_id: String
    payment_status: PaymentStatus!
    payment_timestamp: String
    refund_amount: Float
    refund_timestamp: String
    refund_reason: String
    has_gateway_details: Boolean
    created_at: String!
    updated_at: String!
    
    # Relationships
    order: Order!
    customer: User!
  }

  type Promotion {
    id: ID!
    promo_code: String!
    description: String!
    discount_value: Float!
    discount_type: String!
    is_active: Boolean!
    start_date: String!
    end_date: String
    min_order_value: Float!
    max_discount_amount: Float
    usage_limit: Int
    usage_count: Int!
    allowed_user_types: [String!]!
    applies_to_restaurants: [ID!]!
    created_at: String!
    updated_at: String!
    
    # Relationships
    applicable_restaurants: [Restaurant!]
  }

  type Bid {
    id: ID!
    order_id: ID!
    restaurant_id: ID!
    bid_price: Float!
    estimated_delivery_time_minutes: Int!
    bid_status: BidStatus!
    notes_to_customer: String
    bid_details_if_custom: JSON
    valid_until: String
    created_at: String!
    updated_at: String!
    
    # Relationships
    order: Order!
    restaurant: Restaurant!
    estimated_delivery_time_formatted: String!
  }

  # For handling JSON fields
  scalar JSON

  # Input type for creating an address
  input AddressInput {
    user_id: ID
    address_label: String
    contact_person_name: String!
    contact_person_phone: String!
    address_line1: String!
    address_line2: String
    city: String!
    postal_code: String
    country: String!
    latitude: Float
    longitude: Float
    address_type: AddressType
    is_default_for_user: Boolean
    delivery_instructions: String
  }

  # Input type for creating an order item
  input OrderItemInput {
    menu_item_id: ID
    item_name_if_not_menu_item: String
    quantity: Int!
    price_per_item: Float!
    notes: String
  }

  # Input type for creating an order
  input CreateOrderInput {
    customer_user_id: ID!
    restaurant_id: ID
    order_description: String!
    category_id: ID
    budget_min: Float
    budget_max: Float
    desired_delivery_time: String!
    special_instructions: String
    promo_code: String
    order_items: [OrderItemInput!]
    bidding_ends_at: String
  }

  # Input type for updating an order
  input UpdateOrderInput {
    restaurant_id: ID
    delivery_address_id: ID
    order_description: String
    category_id: ID
    budget_min: Float
    budget_max: Float
    desired_delivery_time: String
    special_instructions: String
    order_status: OrderStatus
    bidding_ends_at: String
  }

  # Input type for creating a payment
  input CreatePaymentInput {
    order_id: ID!
    customer_user_id: ID!
    amount_paid: Float!
    payment_method_used: String!
    payment_gateway_transaction_id: String
    payment_status: PaymentStatus
  }

  # Input type for creating a bid
  input CreateBidInput {
    order_id: ID!
    restaurant_id: ID!
    bid_price: Float!
    estimated_delivery_time_minutes: Int!
    notes_to_customer: String
    bid_details_if_custom: JSON
    valid_until: String
  }

  # Input type for creating a promotion
  input CreatePromotionInput {
    promo_code: String!
    description: String!
    discount_value: Float!
    discount_type: String
    is_active: Boolean
    start_date: String
    end_date: String
    min_order_value: Float
    max_discount_amount: Float
    usage_limit: Int
    allowed_user_types: [String!]
    applies_to_restaurants: [ID!]
  }

  # Filtering & Sorting
  input OrderFilterInput {
    customer_user_id: ID
    restaurant_id: ID
    order_status: [OrderStatus!]
    min_created_date: String
    max_created_date: String
    search_term: String
  }

  input PaginationInput {
    page: Int
    limit: Int
  }

  enum OrderSortField {
    CREATED_AT
    DESIRED_DELIVERY_TIME
    TOTAL_AMOUNT
  }

  enum SortDirection {
    ASC
    DESC
  }

  input OrderSortInput {
    field: OrderSortField!
    direction: SortDirection!
  }

  # Queries
  type Query {
    # Order queries
    order(id: ID!): Order
    orders(
      filter: OrderFilterInput
      sort: OrderSortInput
      pagination: PaginationInput
    ): [Order!]!
    customerOrders(
      customer_id: ID!
      status: [OrderStatus!]
      pagination: PaginationInput
    ): [Order!]!
    restaurantOrders(
      restaurant_id: ID!
      status: [OrderStatus!]
      pagination: PaginationInput
    ): [Order!]!
    
    # Order item queries
    orderItems(order_id: ID!): [OrderItem!]!
    
    # Payment queries
    payment(id: ID!): Payment
    orderPayment(order_id: ID!): Payment
    
    # Address queries
    address(id: ID!): Address
    userAddresses(user_id: ID!): [Address!]!
    
    # Promotion queries
    promotion(id: ID!): Promotion
    promotionByCode(promo_code: String!): Promotion
    validPromotions: [Promotion!]!
    
    # Bid queries
    bid(id: ID!): Bid
    orderBids(order_id: ID!): [Bid!]!
    restaurantBids(restaurant_id: ID!, status: [BidStatus!]): [Bid!]!
  }

  # Mutations
  type Mutation {
    # Order mutations
    createOrder(input: CreateOrderInput!): Order!
    updateOrder(id: ID!, input: UpdateOrderInput!): Order!
    cancelOrder(id: ID!, reason: String): Order!
    markOrderDelivered(id: ID!, actual_delivery_time: String): Order!
    
    # Order item mutations
    addOrderItem(order_id: ID!, input: OrderItemInput!): OrderItem!
    removeOrderItem(id: ID!): Boolean!
    
    # Payment mutations
    createPayment(input: CreatePaymentInput!): Payment!
    updatePaymentStatus(id: ID!, status: PaymentStatus!): Payment!
    refundPayment(id: ID!, amount: Float!, reason: String): Payment!
    
    # Address mutations
    createAddress(input: AddressInput!): Address!
    updateAddress(id: ID!, input: AddressInput!): Address!
    deleteAddress(id: ID!): Boolean!
    setDefaultAddress(id: ID!, user_id: ID!): Boolean!
    
    # Promotion mutations
    createPromotion(input: CreatePromotionInput!): Promotion!
    updatePromotion(id: ID!, input: CreatePromotionInput!): Promotion!
    deactivatePromotion(id: ID!): Promotion!
    applyPromoToOrder(order_id: ID!, promo_code: String!): Order!
    
    # Bid mutations
    createBid(input: CreateBidInput!): Bid!
    updateBidStatus(id: ID!, status: BidStatus!): Bid!
    acceptBid(id: ID!): Order!
  }

  # Extended type from User service
  type User {
    id: ID!
    full_name: String!
    email: String!
    phone_number: String!
    user_type: String!
  }

  # Extended type from Restaurant service
  type Restaurant {
    id: ID!
    name: String!
    address: String!
    cuisine_type: String!
  }

  # Extended type from Restaurant service
  type MenuItem {
    id: ID!
    name: String!
    description: String!
    price: Float!
  }
`;

module.exports = orderTypeDefs; 
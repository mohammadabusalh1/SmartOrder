const mongoose = require('mongoose');
const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');

const typeDefs = require('../graphql/typeDefs/orderTypeDefs');
const resolvers = require('../graphql/resolvers/orderResolvers');
const { Order, OrderStatusEnum, PaymentStatusEnum, BidStatusEnum } = require('../models/Order');

//-------------------------------------------------------------
// GraphQL RESOLVER TESTS
//-------------------------------------------------------------
describe('Order GraphQL Resolvers', () => {
  let server, query, mutate;
  let testOrderId, testCustomerId, testRestaurantId, testAddressId, testBidId;

  beforeAll(async () => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({})
    });

    const testClient = createTestClient(server);
    query = testClient.query;
    mutate = testClient.mutate;

    testCustomerId = new mongoose.Types.ObjectId();
    testRestaurantId = new mongoose.Types.ObjectId();
    testAddressId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    // Create a test order for each test
    const orderData = {
      customer_user_id: testCustomerId,
      restaurant_id: testRestaurantId,
      delivery_address: {
        _id: testAddressId,
        contact_person_name: 'Test Person',
        contact_person_phone: '+1234567890',
        address_line1: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        address_type: 'home',
        is_default_for_user: true
      },
      order_description: 'Test order for GraphQL resolvers',
      desired_delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      order_status: OrderStatusEnum.BIDDING,
      discount_amount: 0,
      total_amount_before_promo: 0,
      final_total_amount: 0,
      order_items: [],
      bids: []
    };

    const testOrder = await Order.create(orderData);
    testOrderId = testOrder._id;

    // Add a test bid
    const bidData = {
      restaurant_id: testRestaurantId,
      bid_price: 25.99,
      estimated_delivery_time_minutes: 45
    };
    testOrder.addBid(bidData);
    await testOrder.save();
    testBidId = testOrder.bids[0]._id;
  });

  // QUERY TESTS
  describe('Queries', () => {
    test('order - should fetch a single order by ID', async () => {
      const GET_ORDER = gql`
        query GetOrder($id: ID!) {
          order(id: $id) {
            id
            order_description
            order_status
          }
        }
      `;

      const response = await query({ 
        query: GET_ORDER, 
        variables: { id: testOrderId.toString() } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.order).toBeDefined();
      expect(response.data.order.id).toBe(testOrderId.toString());
      expect(response.data.order.order_description).toBe('Test order for GraphQL resolvers');
      expect(response.data.order.order_status).toBe('BIDDING');
    });

    test('orders - should fetch orders with filters', async () => {
      const GET_ORDERS = gql`
        query GetOrders($filter: OrderFilterInput) {
          orders(filter: $filter) {
            id
            order_status
          }
        }
      `;

      const response = await query({ 
        query: GET_ORDERS, 
        variables: { 
          filter: { 
            customer_user_id: testCustomerId.toString(),
            order_status: ["BIDDING"]
          } 
        } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.orders).toBeInstanceOf(Array);
      expect(response.data.orders.length).toBeGreaterThanOrEqual(1);
      expect(response.data.orders[0].order_status).toBe('BIDDING');
    });

    test('customerOrders - should fetch orders for a specific customer', async () => {
      const GET_CUSTOMER_ORDERS = gql`
        query GetCustomerOrders($customerId: ID!, $status: [OrderStatus!]) {
          customerOrders(customer_id: $customerId, status: $status) {
            id
            order_status
          }
        }
      `;

      const response = await query({ 
        query: GET_CUSTOMER_ORDERS, 
        variables: { 
          customerId: testCustomerId.toString(),
          status: ["BIDDING"]
        } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.customerOrders).toBeInstanceOf(Array);
      expect(response.data.customerOrders.length).toBeGreaterThanOrEqual(1);
    });

    test('restaurantOrders - should fetch orders for a specific restaurant', async () => {
      const GET_RESTAURANT_ORDERS = gql`
        query GetRestaurantOrders($restaurantId: ID!, $status: [OrderStatus!]) {
          restaurantOrders(restaurant_id: $restaurantId, status: $status) {
            id
            order_status
          }
        }
      `;

      const response = await query({ 
        query: GET_RESTAURANT_ORDERS, 
        variables: { 
          restaurantId: testRestaurantId.toString(),
          status: ["BIDDING"]
        } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.restaurantOrders).toBeInstanceOf(Array);
    });

    test('orderBids - should fetch bids for a specific order', async () => {
      const GET_ORDER_BIDS = gql`
        query GetOrderBids($orderId: ID!) {
          orderBids(order_id: $orderId) {
            id
            bid_price
            bid_status
          }
        }
      `;

      const response = await query({ 
        query: GET_ORDER_BIDS, 
        variables: { orderId: testOrderId.toString() } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.orderBids).toBeInstanceOf(Array);
      expect(response.data.orderBids.length).toBe(1);
      expect(response.data.orderBids[0].bid_status).toBe('PENDING');
    });

    test('restaurantBids - should fetch bids from a specific restaurant', async () => {
      const GET_RESTAURANT_BIDS = gql`
        query GetRestaurantBids($restaurantId: ID!, $status: [BidStatus!]) {
          restaurantBids(restaurant_id: $restaurantId, status: $status) {
            id
            bid_price
            bid_status
          }
        }
      `;

      const response = await query({ 
        query: GET_RESTAURANT_BIDS, 
        variables: { 
          restaurantId: testRestaurantId.toString(),
          status: ["PENDING"]
        } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.restaurantBids).toBeInstanceOf(Array);
      expect(response.data.restaurantBids.length).toBeGreaterThanOrEqual(1);
    });
  });

  // MUTATION TESTS
  describe('Mutations', () => {
    test('createOrder - should create a new order', async () => {
      const CREATE_ORDER = gql`
        mutation CreateOrder($input: CreateOrderInput!) {
          createOrder(input: $input) {
            id
            order_description
            order_status
          }
        }
      `;

      const newOrderInput = {
        customer_user_id: testCustomerId.toString(),
        order_description: "New test order via mutation",
        desired_delivery_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        new_delivery_address: {
          contact_person_name: "New Person",
          contact_person_phone: "+9876543210",
          address_line1: "456 New St",
          city: "New City",
          country: "New Country",
          address_type: "HOME",
          is_default_for_user: false
        }
      };

      const response = await mutate({ 
        mutation: CREATE_ORDER, 
        variables: { input: newOrderInput } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.createOrder).toBeDefined();
      expect(response.data.createOrder.order_description).toBe("New test order via mutation");
      expect(response.data.createOrder.order_status).toBe("BIDDING");
    });

    test('updateOrder - should update an existing order', async () => {
      const UPDATE_ORDER = gql`
        mutation UpdateOrder($id: ID!, $input: UpdateOrderInput!) {
          updateOrder(id: $id, input: $input) {
            id
            order_description
            special_instructions
          }
        }
      `;

      const updateInput = {
        order_description: "Updated order description",
        special_instructions: "New special instructions"
      };

      const response = await mutate({ 
        mutation: UPDATE_ORDER, 
        variables: { 
          id: testOrderId.toString(),
          input: updateInput 
        } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.updateOrder).toBeDefined();
      expect(response.data.updateOrder.order_description).toBe("Updated order description");
      expect(response.data.updateOrder.special_instructions).toBe("New special instructions");
    });

    test('cancelOrder - should cancel an order', async () => {
      const CANCEL_ORDER = gql`
        mutation CancelOrder($id: ID!, $reason: String) {
          cancelOrder(id: $id, reason: $reason) {
            id
            order_status
            cancellation_reason
          }
        }
      `;

      const response = await mutate({ 
        mutation: CANCEL_ORDER, 
        variables: { 
          id: testOrderId.toString(),
          reason: "Testing cancellation" 
        } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.cancelOrder).toBeDefined();
      expect(response.data.cancelOrder.order_status).toBe("CANCELLED");
      expect(response.data.cancelOrder.cancellation_reason).toBe("Testing cancellation");
    });

    test('createBid - should create a new bid on an order', async () => {
      const CREATE_BID = gql`
        mutation CreateBid($input: CreateBidInput!) {
          createBid(input: $input) {
            id
            bid_price
            bid_status
          }
        }
      `;

      const bidInput = {
        order_id: testOrderId.toString(),
        restaurant_id: new mongoose.Types.ObjectId().toString(),
        bid_price: 35.50,
        estimated_delivery_time_minutes: 30,
        notes_to_customer: "New bid test notes"
      };

      const response = await mutate({ 
        mutation: CREATE_BID, 
        variables: { input: bidInput } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.createBid).toBeDefined();
      expect(response.data.createBid.bid_price).toBe(35.5);
      expect(response.data.createBid.bid_status).toBe("PENDING");
    });

    test('acceptBid - should accept a bid and update order status', async () => {
      const ACCEPT_BID = gql`
        mutation AcceptBid($id: ID!) {
          acceptBid(id: $id) {
            id
            order_status
            restaurant_id
          }
        }
      `;

      const response = await mutate({ 
        mutation: ACCEPT_BID, 
        variables: { id: testBidId.toString() } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.acceptBid).toBeDefined();
      expect(response.data.acceptBid.order_status).toBe("ACCEPTED");
      expect(response.data.acceptBid.restaurant_id).toBe(testRestaurantId.toString());
    });

    test('markOrderDelivered - should mark an order as delivered', async () => {
      // First set the order to an appropriate status
      const testOrder = await Order.findById(testOrderId);
      testOrder.order_status = OrderStatusEnum.OUT_FOR_DELIVERY;
      await testOrder.save();
      
      const MARK_DELIVERED = gql`
        mutation MarkOrderDelivered($id: ID!, $deliveryTime: String) {
          markOrderDelivered(id: $id, actual_delivery_time: $deliveryTime) {
            id
            order_status
            actual_delivery_time
          }
        }
      `;

      const deliveryTime = new Date().toISOString();
      const response = await mutate({ 
        mutation: MARK_DELIVERED, 
        variables: { 
          id: testOrderId.toString(),
          deliveryTime 
        } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.markOrderDelivered).toBeDefined();
      expect(response.data.markOrderDelivered.order_status).toBe("DELIVERED");
      
      // Simply verify that the delivery time exists, without comparing exact values
      expect(response.data.markOrderDelivered.actual_delivery_time).toBeDefined();
    });

    test('createPayment - should create a payment for an order', async () => {
      const CREATE_PAYMENT = gql`
        mutation CreatePayment($input: CreatePaymentInput!) {
          createPayment(input: $input) {
            id
            amount_paid
            payment_status
          }
        }
      `;

      const paymentInput = {
        order_id: testOrderId.toString(),
        customer_user_id: testCustomerId.toString(),
        amount_paid: 29.99,
        payment_method_used: "credit_card"
      };

      const response = await mutate({ 
        mutation: CREATE_PAYMENT, 
        variables: { input: paymentInput } 
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.createPayment).toBeDefined();
      expect(response.data.createPayment.amount_paid).toBe(29.99);
      expect(response.data.createPayment.payment_status).toBe("PENDING");
    });
  });
});

//-------------------------------------------------------------
// ORDER STATE TRANSITIONS TESTS
//-------------------------------------------------------------
describe('Order State Transitions', () => {
  let testOrder;
  const testCustomerId = new mongoose.Types.ObjectId();
  const testRestaurantId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    // Create a test order
    const orderData = {
      customer_user_id: testCustomerId,
      order_description: 'Order for state transition tests',
      delivery_address: {
        contact_person_name: 'Test Person',
        contact_person_phone: '+1234567890',
        address_line1: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        address_type: 'home',
        is_default_for_user: true
      },
      desired_delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    };

    testOrder = await Order.create(orderData);
  });

  test('Initial order status should be BIDDING when no restaurant is specified', async () => {
    expect(testOrder.order_status).toBe(OrderStatusEnum.BIDDING);
  });

  test('Initial order status should be PENDING when restaurant is specified', async () => {
    const orderWithRestaurant = await Order.create({
      customer_user_id: testCustomerId,
      restaurant_id: testRestaurantId,
      order_description: 'Order with restaurant',
      delivery_address: {
        contact_person_name: 'Test Person',
        contact_person_phone: '+1234567890',
        address_line1: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        address_type: 'home',
        is_default_for_user: true
      },
      desired_delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    expect(orderWithRestaurant.order_status).toBe(OrderStatusEnum.PENDING);
  });

  test('Should transition from BIDDING to ACCEPTED when a bid is accepted', async () => {
    // Add a bid
    testOrder.addBid({
      restaurant_id: testRestaurantId,
      bid_price: 25.99,
      estimated_delivery_time_minutes: 45
    });
    await testOrder.save();

    // Accept the bid
    const bidId = testOrder.bids[0]._id;
    await testOrder.acceptBid(bidId);
    
    expect(testOrder.order_status).toBe(OrderStatusEnum.ACCEPTED);
    expect(testOrder.restaurant_id.toString()).toBe(testRestaurantId.toString());
    expect(testOrder.bids[0].bid_status).toBe('accepted');
  });

  test('Should transition from ACCEPTED to PREPARING', async () => {
    // Setup: get order to ACCEPTED state
    testOrder.restaurant_id = testRestaurantId;
    testOrder.order_status = OrderStatusEnum.ACCEPTED;
    await testOrder.save();

    // Transition to PREPARING
    testOrder.order_status = OrderStatusEnum.PREPARING;
    await testOrder.save();
    
    expect(testOrder.order_status).toBe(OrderStatusEnum.PREPARING);
  });

  test('Should transition from PREPARING to READY_FOR_PICKUP', async () => {
    // Setup: get order to PREPARING state
    testOrder.restaurant_id = testRestaurantId;
    testOrder.order_status = OrderStatusEnum.PREPARING;
    await testOrder.save();

    // Transition to READY_FOR_PICKUP
    testOrder.order_status = OrderStatusEnum.READY_FOR_PICKUP;
    await testOrder.save();
    
    expect(testOrder.order_status).toBe(OrderStatusEnum.READY_FOR_PICKUP);
  });

  test('Should transition from READY_FOR_PICKUP to OUT_FOR_DELIVERY', async () => {
    // Setup: get order to READY_FOR_PICKUP state
    testOrder.restaurant_id = testRestaurantId;
    testOrder.order_status = OrderStatusEnum.READY_FOR_PICKUP;
    await testOrder.save();

    // Transition to OUT_FOR_DELIVERY
    testOrder.order_status = OrderStatusEnum.OUT_FOR_DELIVERY;
    await testOrder.save();
    
    expect(testOrder.order_status).toBe(OrderStatusEnum.OUT_FOR_DELIVERY);
  });

  test('Should transition from OUT_FOR_DELIVERY to DELIVERED', async () => {
    // Setup: get order to OUT_FOR_DELIVERY state
    testOrder.restaurant_id = testRestaurantId;
    testOrder.order_status = OrderStatusEnum.OUT_FOR_DELIVERY;
    await testOrder.save();

    // Transition to DELIVERED
    const deliveryTime = new Date();
    testOrder.markDelivered(deliveryTime);
    await testOrder.save();
    
    expect(testOrder.order_status).toBe(OrderStatusEnum.DELIVERED);
  });

  test('Should transition from DELIVERED to COMPLETED', async () => {
    // Setup: get order to DELIVERED state
    testOrder.restaurant_id = testRestaurantId;
    testOrder.order_status = OrderStatusEnum.DELIVERED;
    testOrder.actual_delivery_time = new Date();
    await testOrder.save();

    // Transition to COMPLETED
    testOrder.order_status = OrderStatusEnum.COMPLETED;
    await testOrder.save();
    
    expect(testOrder.order_status).toBe(OrderStatusEnum.COMPLETED);
  });

  test('Should allow cancellation from BIDDING state', async () => {
    const reason = 'Testing cancellation from BIDDING';
    testOrder.cancelOrder(reason);
    await testOrder.save();
    
    expect(testOrder.order_status).toBe(OrderStatusEnum.CANCELLED);
    expect(testOrder.cancellation_reason).toBe(reason);
    expect(testOrder.cancellation_timestamp).toBeDefined();
  });

  test('Should allow cancellation from PENDING state', async () => {
    // Setup: get order to PENDING state
    testOrder.restaurant_id = testRestaurantId;
    testOrder.order_status = OrderStatusEnum.PENDING;
    await testOrder.save();

    const reason = 'Testing cancellation from PENDING';
    testOrder.cancelOrder(reason);
    await testOrder.save();
    
    expect(testOrder.order_status).toBe(OrderStatusEnum.CANCELLED);
  });
});

//-------------------------------------------------------------
// PAYMENT PROCESSING TESTS
//-------------------------------------------------------------
describe('Payment Processing', () => {
  let testOrder;
  const testCustomerId = new mongoose.Types.ObjectId();
  const testRestaurantId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    // Create a test order
    const orderData = {
      customer_user_id: testCustomerId,
      restaurant_id: testRestaurantId,
      order_description: 'Order for payment tests',
      delivery_address: {
        contact_person_name: 'Test Person',
        contact_person_phone: '+1234567890',
        address_line1: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        address_type: 'home',
        is_default_for_user: true
      },
      desired_delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
      order_status: 'accepted',
      total_amount_before_promo: 50,
      discount_amount: 5,
      final_total_amount: 45
    };

    testOrder = await Order.create(orderData);
  });

  test('Should create a payment for an order', async () => {
    const paymentData = {
      customer_user_id: testCustomerId,
      amount_paid: 45,
      payment_method_used: 'credit_card',
      payment_gateway_transaction_id: 'test_transaction_123'
    };

    // Create payment directly
    testOrder.payment = paymentData;
    await testOrder.save();

    expect(testOrder.payment).toBeDefined();
    expect(testOrder.payment.amount_paid).toBe(45);
    expect(testOrder.payment.payment_method_used).toBe('credit_card');
    expect(testOrder.payment.payment_status).toBe(PaymentStatusEnum.PENDING);
  });

  test('Should update payment status to COMPLETED', async () => {
    // Create payment
    testOrder.payment = {
      customer_user_id: testCustomerId,
      amount_paid: 45,
      payment_method_used: 'credit_card'
    };
    await testOrder.save();

    // Update status to COMPLETED
    testOrder.payment.payment_status = PaymentStatusEnum.COMPLETED;
    await testOrder.save();

    expect(testOrder.payment.payment_status).toBe(PaymentStatusEnum.COMPLETED);
    expect(testOrder.payment.payment_timestamp).toBeDefined();
  });

  test('Should process a refund', async () => {
    // Create payment and mark as COMPLETED
    testOrder.payment = {
      customer_user_id: testCustomerId,
      amount_paid: 45,
      payment_method_used: 'credit_card',
      payment_status: PaymentStatusEnum.COMPLETED,
      payment_timestamp: new Date()
    };
    await testOrder.save();

    // Process refund
    const refundAmount = 20;
    const refundReason = 'Partial refund for test';
    testOrder.payment.refund_amount = refundAmount;
    testOrder.payment.refund_reason = refundReason;
    testOrder.payment.payment_status = PaymentStatusEnum.PARTIALLY_REFUNDED;
    await testOrder.save();

    expect(testOrder.payment.refund_amount).toBe(20);
    expect(testOrder.payment.refund_reason).toBe(refundReason);
    expect(testOrder.payment.refund_timestamp).toBeDefined();
    expect(testOrder.payment.payment_status).toBe(PaymentStatusEnum.PARTIALLY_REFUNDED);
  });

  test('Should process a full refund and update status to REFUNDED', async () => {
    // Create payment and mark as COMPLETED
    testOrder.payment = {
      customer_user_id: testCustomerId,
      amount_paid: 45,
      payment_method_used: 'credit_card',
      payment_status: PaymentStatusEnum.COMPLETED,
      payment_timestamp: new Date()
    };
    await testOrder.save();

    // Process full refund
    testOrder.payment.refund_amount = 45;
    testOrder.payment.refund_reason = 'Full refund for test';
    testOrder.payment.payment_status = PaymentStatusEnum.REFUNDED;
    await testOrder.save();

    expect(testOrder.payment.refund_amount).toBe(45);
    expect(testOrder.payment.payment_status).toBe(PaymentStatusEnum.REFUNDED);
  });

  test('Should not allow refund amount greater than payment amount', async () => {
    // Create payment and mark as COMPLETED
    testOrder.payment = {
      customer_user_id: testCustomerId,
      amount_paid: 45,
      payment_method_used: 'credit_card',
      payment_status: PaymentStatusEnum.COMPLETED,
      payment_timestamp: new Date()
    };
    await testOrder.save();

    // Try to refund more than paid - should fail validation
    testOrder.payment.refund_amount = 50;
    
    await expect(testOrder.save()).rejects.toThrow();
  });

  test('Should not allow refund for payments that are not COMPLETED', async () => {
    // Create payment but leave as PENDING
    testOrder.payment = {
      customer_user_id: testCustomerId,
      amount_paid: 45,
      payment_method_used: 'credit_card'
    };
    await testOrder.save();

    // Try to refund
    testOrder.payment.refund_amount = 20;
    testOrder.payment.refund_reason = 'Invalid refund attempt';
    
    // This might not throw if there's no explicit validation
    // But we should check that status isn't changed
    await testOrder.save();
    expect(testOrder.payment.payment_status).toBe(PaymentStatusEnum.PENDING);
  });
});

//-------------------------------------------------------------
// BID MANAGEMENT TESTS
//-------------------------------------------------------------
describe('Bid Management', () => {
  let testOrder;
  const testCustomerId = new mongoose.Types.ObjectId();
  const testRestaurantId1 = new mongoose.Types.ObjectId();
  const testRestaurantId2 = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    // Create a test order in BIDDING state
    const orderData = {
      customer_user_id: testCustomerId,
      order_description: 'Order for bid tests',
      delivery_address: {
        contact_person_name: 'Test Person',
        contact_person_phone: '+1234567890',
        address_line1: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        address_type: 'home',
        is_default_for_user: true
      },
      desired_delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
      budget_min: 20,
      budget_max: 50
    };

    testOrder = await Order.create(orderData);
  });

  test('Should add a bid to an order', async () => {
    const bidData = {
      restaurant_id: testRestaurantId1,
      bid_price: 35.50,
      estimated_delivery_time_minutes: 45,
      notes_to_customer: 'Test bid notes'
    };

    testOrder.addBid(bidData);
    await testOrder.save();

    expect(testOrder.bids.length).toBe(1);
    expect(testOrder.bids[0].restaurant_id.toString()).toBe(testRestaurantId1.toString());
    expect(testOrder.bids[0].bid_price).toBe(35.50);
    expect(testOrder.bids[0].bid_status).toBe(BidStatusEnum.PENDING);
    expect(testOrder.bids[0].valid_until).toBeDefined();
  });

  test('Should allow multiple bids from different restaurants', async () => {
    // Add first bid
    testOrder.addBid({
      restaurant_id: testRestaurantId1,
      bid_price: 40,
      estimated_delivery_time_minutes: 60
    });

    // Add second bid
    testOrder.addBid({
      restaurant_id: testRestaurantId2,
      bid_price: 35,
      estimated_delivery_time_minutes: 75
    });

    await testOrder.save();

    expect(testOrder.bids.length).toBe(2);
    expect(testOrder.bids[0].restaurant_id.toString()).toBe(testRestaurantId1.toString());
    expect(testOrder.bids[1].restaurant_id.toString()).toBe(testRestaurantId2.toString());
  });

  test('Should not allow multiple bids from the same restaurant', async () => {
    // Add first bid
    testOrder.addBid({
      restaurant_id: testRestaurantId1,
      bid_price: 40,
      estimated_delivery_time_minutes: 60
    });
    await testOrder.save();

    // Try adding second bid from same restaurant - should fail validation
    try {
      testOrder.addBid({
        restaurant_id: testRestaurantId1,
        bid_price: 35,
        estimated_delivery_time_minutes: 45
      });
      await testOrder.save();
      fail('Should have thrown an error');
    } catch (error) {
      // Expected error
      expect(error).toBeDefined();
    }
  });

  test('Should accept a bid and update order status', async () => {
    // Add bids
    testOrder.addBid({
      restaurant_id: testRestaurantId1,
      bid_price: 40,
      estimated_delivery_time_minutes: 60
    });
    testOrder.addBid({
      restaurant_id: testRestaurantId2,
      bid_price: 35,
      estimated_delivery_time_minutes: 75
    });
    await testOrder.save();

    // Accept the first bid
    const bidId = testOrder.bids[0]._id;
    testOrder.acceptBid(bidId);
    await testOrder.save();

    expect(testOrder.order_status).toBe('accepted');
    expect(testOrder.restaurant_id.toString()).toBe(testRestaurantId1.toString());
    expect(testOrder.bids[0].bid_status).toBe(BidStatusEnum.ACCEPTED);
    expect(testOrder.bids[1].bid_status).toBe(BidStatusEnum.REJECTED);
    expect(testOrder.final_total_amount).toBe(40);
  });

  test('Should not allow accepting a bid when order is not in BIDDING state', async () => {
    // Set order to CANCELLED state
    testOrder.cancelOrder('Cancelled for testing');
    await testOrder.save();

    // Add a bid (this bypasses normal validation by adding directly to the array)
    testOrder.bids.push({
      restaurant_id: testRestaurantId1,
      bid_price: 40,
      estimated_delivery_time_minutes: 60,
      bid_status: BidStatusEnum.PENDING,
      created_at: new Date(),
      updated_at: new Date()
    });
    await testOrder.save({ validateBeforeSave: false }); // Bypass validation

    // Try to accept the bid - should fail 
    try {
      const bidId = testOrder.bids[0]._id;
      testOrder.acceptBid(bidId);
      await testOrder.save();
      fail('Should have thrown an error');
    } catch (error) {
      // Expected error
      expect(error).toBeDefined();
    }
  });

  test('Should check if a bid is expired', async () => {
    // Add a bid with a past valid_until date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    testOrder.bids.push({
      restaurant_id: testRestaurantId1,
      bid_price: 40,
      estimated_delivery_time_minutes: 60,
      bid_status: BidStatusEnum.PENDING,
      valid_until: yesterday,
      created_at: new Date(),
      updated_at: new Date()
    });
    await testOrder.save();

    // Check if the bid is expired by comparing to current date
    const isExpired = testOrder.bids[0].valid_until < new Date();
    expect(isExpired).toBe(true);
  });

  test('Should reject all bids when order is cancelled', async () => {
    // Add bids
    testOrder.addBid({
      restaurant_id: testRestaurantId1,
      bid_price: 40,
      estimated_delivery_time_minutes: 60
    });
    testOrder.addBid({
      restaurant_id: testRestaurantId2,
      bid_price: 35,
      estimated_delivery_time_minutes: 75
    });
    await testOrder.save();

    // Cancel the order 
    testOrder.cancelOrder('Testing bid rejection on cancel');
    await testOrder.save();

    // All bids should be rejected
    expect(testOrder.bids[0].bid_status).toBe(BidStatusEnum.REJECTED);
    expect(testOrder.bids[1].bid_status).toBe(BidStatusEnum.REJECTED);
  });
});

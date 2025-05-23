const mongoose = require('mongoose');
const { Order, OrderStatusEnum } = require('../models/Order');

describe('Order Model', () => {
  let validOrderData;
  
  beforeEach(() => {
    // Valid order data for testing
    validOrderData = {
      customer_user_id: new mongoose.Types.ObjectId(),
      delivery_address: {
        contact_person_name: 'John Doe',
        contact_person_phone: '+12345678901',
        address_line1: '123 Test Street',
        city: 'Test City',
        country: 'Test Country'
      },
      order_description: 'Test order description',
      desired_delivery_time: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    };
  });
  
  test('should create a valid order', async () => {
    const order = await Order.create(validOrderData);
    
    expect(order).toBeDefined();
    expect(order._id).toBeDefined();
    expect(order.order_status).toBe(OrderStatusEnum.BIDDING);
    expect(order.discount_amount).toBe(0);
    expect(order.created_at).toBeDefined();
    expect(order.updated_at).toBeDefined();
    expect(order.delivery_address).toBeDefined();
    expect(order.delivery_address.contact_person_name).toBe('John Doe');
    expect(order.order_items).toEqual([]);
    expect(order.bids).toEqual([]);
    expect(order.payment).toBeNull();
  });
  
  test('should require customer_user_id', async () => {
    validOrderData.customer_user_id = null;
    
    await expect(Order.create(validOrderData)).rejects.toThrow();
  });
  
  test('should require delivery_address', async () => {
    validOrderData.delivery_address = null;
    
    await expect(Order.create(validOrderData)).rejects.toThrow();
  });
  
  test('should require order_description', async () => {
    validOrderData.order_description = null;
    
    await expect(Order.create(validOrderData)).rejects.toThrow();
  });
  
  test('should require desired_delivery_time', async () => {
    validOrderData.desired_delivery_time = null;
    
    await expect(Order.create(validOrderData)).rejects.toThrow();
  });
  
  test('should set default order status to BIDDING', async () => {
    const order = await Order.create(validOrderData);
    
    expect(order.order_status).toBe(OrderStatusEnum.BIDDING);
  });
  
  test('should set order status to BIDDING when no restaurant_id is provided', async () => {
    validOrderData.restaurant_id = null;
    const order = await Order.create(validOrderData);
    
    expect(order.order_status).toBe(OrderStatusEnum.BIDDING);
  });
  
  test('should validate budget_min to be positive or null', async () => {
    validOrderData.budget_min = -10;
    
    await expect(Order.create(validOrderData)).rejects.toThrow();
  });
  
  test('should validate budget_max to be positive or null', async () => {
    validOrderData.budget_max = -10;
    
    await expect(Order.create(validOrderData)).rejects.toThrow();
  });
  
  test('should validate discount_amount to be positive', async () => {
    validOrderData.discount_amount = -5;
    
    await expect(Order.create(validOrderData)).rejects.toThrow();
  });
  
  test('should validate final_total_amount to be positive or null', async () => {
    validOrderData.final_total_amount = -100;
    
    await expect(Order.create(validOrderData)).rejects.toThrow();
  });
  
  test('should have a virtual order_id that returns _id', async () => {
    const order = await Order.create(validOrderData);
    
    expect(order.order_id.toString()).toBe(order._id.toString());
  });
  
  test('should update updated_at timestamp on save', async () => {
    const order = await Order.create(validOrderData);
    const originalUpdatedAt = order.updated_at;
    
    // Wait a bit to ensure timestamps would be different
    await new Promise(resolve => setTimeout(resolve, 100));
    
    order.order_description = 'Updated description';
    await order.save();
    
    expect(order.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  test('should add an order item', async () => {
    const order = await Order.create(validOrderData);
    
    const itemData = {
      menu_item_id: new mongoose.Types.ObjectId(),
      quantity: 2,
      price_per_item: 10.99
    };
    
    order.addOrderItem(itemData);
    await order.save();
    
    expect(order.order_items.length).toBe(1);
    expect(order.order_items[0].quantity).toBe(2);
    expect(order.order_items[0].price_per_item).toBe(10.99);
    expect(order.order_items[0].subtotal).toBe(21.98);
    
    // Check if total amount is updated
    expect(order.total_amount_before_promo).toBe(21.98);
    expect(order.final_total_amount).toBe(21.98);
  });
  
  test('should remove an order item', async () => {
    const order = await Order.create(validOrderData);
    
    // Add two items
    order.addOrderItem({
      menu_item_id: new mongoose.Types.ObjectId(),
      quantity: 2,
      price_per_item: 10.99
    });
    
    order.addOrderItem({
      item_name_if_not_menu_item: 'Custom Item',
      quantity: 1,
      price_per_item: 5.99
    });
    
    await order.save();
    expect(order.order_items.length).toBe(2);
    
    // Remove the first item
    const itemId = order.order_items[0]._id;
    order.removeOrderItem(itemId);
    await order.save();
    
    expect(order.order_items.length).toBe(1);
    expect(order.order_items[0].item_name_if_not_menu_item).toBe('Custom Item');
    
    // Check if total amount is updated
    expect(order.total_amount_before_promo).toBe(5.99);
    expect(order.final_total_amount).toBe(5.99);
  });
  
  test('should add a bid', async () => {
    const order = await Order.create(validOrderData);
    
    const bidData = {
      restaurant_id: new mongoose.Types.ObjectId(),
      bid_price: 25.99,
      estimated_delivery_time_minutes: 45
    };
    
    order.addBid(bidData);
    await order.save();
    
    expect(order.bids.length).toBe(1);
    expect(order.bids[0].bid_price).toBe(25.99);
    expect(order.bids[0].estimated_delivery_time_minutes).toBe(45);
    expect(order.bids[0].bid_status).toBe('pending');
  });
  
  test('should cancel an order', async () => {
    const order = await Order.create(validOrderData);
    
    order.cancelOrder('Test cancellation reason');
    await order.save();
    
    expect(order.order_status).toBe(OrderStatusEnum.CANCELLED);
    expect(order.cancellation_reason).toBe('Test cancellation reason');
    expect(order.cancellation_timestamp).toBeDefined();
  });
}); 
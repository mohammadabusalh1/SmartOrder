const mongoose = require('mongoose');
const Notification = require('../models/Notification');

describe('Notification Model Tests', () => {
  const userId1 = new mongoose.Types.ObjectId();
  const userId2 = new mongoose.Types.ObjectId();
  const orderId = new mongoose.Types.ObjectId();
  
  test('should create a notification successfully', async () => {
    const notification = await Notification.create({
      recipient_user_id: userId1,
      title: 'New Order',
      message: 'Your order has been confirmed',
      notification_type: 'order_update',
      related_entity_type: 'order',
      related_entity_id: orderId
    });
    
    expect(notification).toBeDefined();
    expect(notification.recipient_user_id.toString()).toBe(userId1.toString());
    expect(notification.title).toBe('New Order');
    expect(notification.message).toBe('Your order has been confirmed');
    expect(notification.notification_type).toBe('order_update');
    expect(notification.related_entity_type).toBe('order');
    expect(notification.related_entity_id.toString()).toBe(orderId.toString());
    expect(notification.is_read).toBe(false);
    expect(notification.read_at).toBeNull();
    expect(notification.created_at).toBeDefined();
  });
  
  test('should create a notification with custom delivery channels', async () => {
    const notification = await Notification.create({
      recipient_user_id: userId1,
      title: 'Important Update',
      message: 'System maintenance scheduled',
      notification_type: 'system',
      delivery_channels: {
        push: true,
        email: true,
        sms: true
      }
    });
    
    expect(notification).toBeDefined();
    expect(notification.delivery_channels.push).toBe(true);
    expect(notification.delivery_channels.email).toBe(true);
    expect(notification.delivery_channels.sms).toBe(true);
  });
  
  test('should fail when required fields are missing', async () => {
    await expect(Notification.create({
      title: 'Missing recipient',
      message: 'Test message',
      notification_type: 'system'
    })).rejects.toThrow();
    
    await expect(Notification.create({
      recipient_user_id: userId1,
      message: 'Missing title',
      notification_type: 'system'
    })).rejects.toThrow();
    
    await expect(Notification.create({
      recipient_user_id: userId1,
      title: 'Missing message',
      notification_type: 'system'
    })).rejects.toThrow();
    
    await expect(Notification.create({
      recipient_user_id: userId1,
      title: 'Test',
      message: 'Missing type'
    })).rejects.toThrow();
  });
  
  test('should mark notification as read', async () => {
    const notification = await Notification.create({
      recipient_user_id: userId1,
      title: 'Test Notification',
      message: 'Mark as read test',
      notification_type: 'system'
    });
    
    expect(notification.is_read).toBe(false);
    expect(notification.read_at).toBeNull();
    
    const updatedNotification = await Notification.findByIdAndUpdate(
      notification._id,
      { 
        is_read: true,
        read_at: new Date()
      },
      { new: true }
    );
    
    expect(updatedNotification.is_read).toBe(true);
    expect(updatedNotification.read_at).toBeDefined();
  });
  
  test('should find notifications for a user', async () => {
    // Create multiple notifications for a user
    await Notification.create({
      recipient_user_id: userId1,
      title: 'Notification 1',
      message: 'Test message 1',
      notification_type: 'system'
    });
    
    await Notification.create({
      recipient_user_id: userId1,
      title: 'Notification 2',
      message: 'Test message 2',
      notification_type: 'message'
    });
    
    await Notification.create({
      recipient_user_id: userId2, // Different user
      title: 'Notification 3',
      message: 'Test message 3',
      notification_type: 'system'
    });
    
    const notifications = await Notification.find({
      recipient_user_id: userId1
    }).sort({ created_at: -1 });
    
    expect(notifications.length).toBe(2);
  });
  
  test('should count unread notifications', async () => {
    // Create read and unread notifications
    await Notification.create({
      recipient_user_id: userId1,
      title: 'Read Notification',
      message: 'This has been read',
      notification_type: 'system',
      is_read: true,
      read_at: new Date()
    });
    
    await Notification.create({
      recipient_user_id: userId1,
      title: 'Unread Notification 1',
      message: 'This is unread',
      notification_type: 'message'
    });
    
    await Notification.create({
      recipient_user_id: userId1,
      title: 'Unread Notification 2',
      message: 'This is also unread',
      notification_type: 'order_update'
    });
    
    const unreadCount = await Notification.countDocuments({
      recipient_user_id: userId1,
      is_read: false
    });
    
    expect(unreadCount).toBe(2);
  });
  
  test('should delete a notification', async () => {
    const notification = await Notification.create({
      recipient_user_id: userId1,
      title: 'Delete Test',
      message: 'This will be deleted',
      notification_type: 'system'
    });
    
    const deleteResult = await Notification.deleteOne({ _id: notification._id });
    expect(deleteResult.deletedCount).toBe(1);
    
    const foundNotification = await Notification.findById(notification._id);
    expect(foundNotification).toBeNull();
  });
}); 
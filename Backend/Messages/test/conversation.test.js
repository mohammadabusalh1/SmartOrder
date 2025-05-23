const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

describe('Conversation Model Tests', () => {
  const userId1 = new mongoose.Types.ObjectId();
  const userId2 = new mongoose.Types.ObjectId();
  const orderId = new mongoose.Types.ObjectId();
  
  test('should create a new conversation successfully', async () => {
    const conversation = await Conversation.create({
      sender_user_id: userId1,
      receiver_user_id: userId2,
      order_id: orderId
    });
    
    expect(conversation).toBeDefined();
    expect(conversation.sender_user_id.toString()).toBe(userId1.toString());
    expect(conversation.receiver_user_id.toString()).toBe(userId2.toString());
    expect(conversation.order_id.toString()).toBe(orderId.toString());
    expect(conversation.created_at).toBeDefined();
    expect(conversation.updated_at).toBeDefined();
  });
  
  test('should create a conversation without orderId', async () => {
    const conversation = await Conversation.create({
      sender_user_id: userId1,
      receiver_user_id: userId2
    });
    
    expect(conversation).toBeDefined();
    expect(conversation.order_id).toBeNull();
  });
  
  test('should fail when required fields are missing', async () => {
    await expect(Conversation.create({
      sender_user_id: userId1
    })).rejects.toThrow();
    
    await expect(Conversation.create({
      receiver_user_id: userId2
    })).rejects.toThrow();
  });
  
  test('should find conversations for a user', async () => {
    // Create two conversations where user1 is sender
    await Conversation.create({
      sender_user_id: userId1,
      receiver_user_id: userId2
    });
    
    await Conversation.create({
      sender_user_id: userId1,
      receiver_user_id: new mongoose.Types.ObjectId()
    });
    
    // Create one conversation where user1 is receiver
    await Conversation.create({
      sender_user_id: new mongoose.Types.ObjectId(),
      receiver_user_id: userId1
    });
    
    // User1 should have 3 conversations total
    const conversations = await Conversation.find({
      $or: [
        { sender_user_id: userId1 },
        { receiver_user_id: userId1 }
      ]
    });
    
    expect(conversations.length).toBe(3);
  });
  
  test('should populate messages virtual', async () => {
    // Create a conversation
    const conversation = await Conversation.create({
      sender_user_id: userId1,
      receiver_user_id: userId2
    });
    
    // Create messages for this conversation
    await Message.create({
      conversation_id: conversation._id,
      sender_id: userId1,
      message_content: 'Hello',
      message_type: 'text'
    });
    
    await Message.create({
      conversation_id: conversation._id,
      sender_id: userId2,
      message_content: 'Hi there',
      message_type: 'text'
    });
    
    // Retrieve conversation with populated messages
    const populatedConversation = await Conversation.findById(conversation._id);
    await populatedConversation.populate('messages');
    
    expect(populatedConversation.messages.length).toBe(2);
    expect(populatedConversation.messages[0].message_content).toBeDefined();
  });
}); 
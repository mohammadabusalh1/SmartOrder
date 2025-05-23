const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

describe('Message Model Tests', () => {
  const userId1 = new mongoose.Types.ObjectId();
  const userId2 = new mongoose.Types.ObjectId();
  let conversationId;
  
  beforeEach(async () => {
    // Create a conversation to use in tests
    const conversation = await Conversation.create({
      sender_user_id: userId1,
      receiver_user_id: userId2
    });
    conversationId = conversation._id;
  });
  
  test('should create a text message successfully', async () => {
    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: userId1,
      message_content: 'Hello, this is a test message',
      message_type: 'text'
    });
    
    expect(message).toBeDefined();
    expect(message.conversation_id.toString()).toBe(conversationId.toString());
    expect(message.sender_id.toString()).toBe(userId1.toString());
    expect(message.message_content).toBe('Hello, this is a test message');
    expect(message.message_type).toBe('text');
    expect(message.sent_at).toBeDefined();
    expect(message.read_at).toBeNull();
  });
  
  test('should create message with attachment', async () => {
    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: userId1,
      message_content: 'Check this image',
      attachment_url: 'https://example.com/image.jpg',
      message_type: 'image'
    });
    
    expect(message).toBeDefined();
    expect(message.attachment_url).toBe('https://example.com/image.jpg');
    expect(message.message_type).toBe('image');
  });
  
  test('should fail when required fields are missing', async () => {
    await expect(Message.create({
      sender_id: userId1,
      message_content: 'Missing conversation'
    })).rejects.toThrow();
    
    await expect(Message.create({
      conversation_id: conversationId,
      message_content: 'Missing sender'
    })).rejects.toThrow();
    
    await expect(Message.create({
      conversation_id: conversationId,
      sender_id: userId1
    })).rejects.toThrow();
  });
  
  test('should mark message as read', async () => {
    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: userId1,
      message_content: 'Read test',
      message_type: 'text'
    });
    
    expect(message.read_at).toBeNull();
    
    const updatedMessage = await Message.findByIdAndUpdate(
      message._id,
      { read_at: new Date() },
      { new: true }
    );
    
    expect(updatedMessage.read_at).toBeDefined();
  });
  
  test('should find messages by conversation', async () => {
    // Create multiple messages for the conversation
    await Message.create({
      conversation_id: conversationId,
      sender_id: userId1,
      message_content: 'Message 1',
      message_type: 'text'
    });
    
    await Message.create({
      conversation_id: conversationId,
      sender_id: userId2,
      message_content: 'Message 2',
      message_type: 'text'
    });
    
    await Message.create({
      conversation_id: conversationId,
      sender_id: userId1,
      message_content: 'Message 3',
      message_type: 'text'
    });
    
    const messages = await Message.find({ conversation_id: conversationId })
      .sort({ sent_at: -1 });
    
    expect(messages.length).toBe(3);
    expect(messages[0].message_content).toBe('Message 3');
  });
  
  test('should count unread messages', async () => {
    // Create read and unread messages
    await Message.create({
      conversation_id: conversationId,
      sender_id: userId1,
      message_content: 'Read message',
      message_type: 'text',
      read_at: new Date()
    });
    
    await Message.create({
      conversation_id: conversationId,
      sender_id: userId2,
      message_content: 'Unread message 1',
      message_type: 'text'
    });
    
    await Message.create({
      conversation_id: conversationId,
      sender_id: userId2,
      message_content: 'Unread message 2',
      message_type: 'text'
    });
    
    const unreadCount = await Message.countDocuments({
      conversation_id: conversationId,
      sender_id: userId2, // Messages from user2 to user1
      read_at: null
    });
    
    expect(unreadCount).toBe(2);
  });
}); 
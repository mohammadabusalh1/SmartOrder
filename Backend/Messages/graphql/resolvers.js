const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { sendMessageNotification } = require('../utils/notificationHelper');
const JSONScalar = require('./scalars/json');

const resolvers = {
  JSON: JSONScalar,
  Query: {
    // Get all conversations for a user
    conversations: async (_, { userId }) => {
      try {
        return await Conversation.find({
          $or: [
            { sender_user_id: userId },
            { receiver_user_id: userId }
          ]
        }).sort({ updated_at: -1 });
      } catch (error) {
        axios.post("http://localhost:4005/events", {
          type: "Error",
          data: {
            ...conversation,
          },
        });
        throw new Error(`Failed to fetch conversations: ${error.message}`);
      }
    },

    // Get a specific conversation by ID
    conversation: async (_, { id }) => {
      try {
        return await Conversation.findById(id);
      } catch (error) {
        throw new Error(`Failed to fetch conversation: ${error.message}`);
      }
    },

    // Get messages for a specific conversation
    messages: async (_, { conversationId, limit = 20, offset = 0 }) => {
      try {
        return await Message.find({ conversation_id: conversationId })
          .sort({ sent_at: -1 })
          .skip(offset)
          .limit(limit);
      } catch (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }
    },

    // Count unread messages for a user
    unreadMessagesCount: async (_, { userId }) => {
      try {
        // Find all conversations involving the user
        const conversations = await Conversation.find({
          $or: [
            { sender_user_id: userId },
            { receiver_user_id: userId }
          ]
        });

        // Get IDs of these conversations
        const conversationIds = conversations.map(convo => convo._id);

        // Count unread messages in these conversations where user is not the sender
        return await Message.countDocuments({
          conversation_id: { $in: conversationIds },
          sender_id: { $ne: userId },
          read_at: null
        });
      } catch (error) {
        throw new Error(`Failed to count unread messages: ${error.message}`);
      }
    }
  },

  Mutation: {
    // event bus
    events: async (_, { input }) => {
    },
    // Create a new conversation
    createConversation: async (_, { input }) => {
      try {
        // Check if conversation already exists between these users
        const existingConversation = await Conversation.findOne({
          $or: [
            {
              sender_user_id: input.sender_user_id,
              receiver_user_id: input.receiver_user_id,
              order_id: input.order_id
            },
            {
              sender_user_id: input.receiver_user_id,
              receiver_user_id: input.sender_user_id,
              order_id: input.order_id
            }
          ]
        });

        if (existingConversation) {
          return existingConversation;
        }

        // Create new conversation
        return await Conversation.create(input);
      } catch (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }
    },

    // Send a new message
    sendMessage: async (_, { input }, { user }) => {
      try {
        // Create the new message
        const message = await Message.create(input);

        // Update the conversation's updated_at timestamp
        const conversation = await Conversation.findByIdAndUpdate(
          input.conversation_id,
          { updated_at: new Date() },
          { new: true }
        );

        // Send notification to recipient
        if (user && conversation) {
          // In a real scenario you'd have user data in context
          // For simplicity, we're using the authenticated user
          await sendMessageNotification(message, user, conversation);
        }

        return message;
      } catch (error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }
    },

    // Mark a message as read
    markMessageAsRead: async (_, { id }) => {
      try {
        return await Message.findByIdAndUpdate(
          id,
          {
            read_at: new Date(),
            updated_at: new Date()
          },
          { new: true }
        );
      } catch (error) {
        throw new Error(`Failed to mark message as read: ${error.message}`);
      }
    },

    // Mark all messages in a conversation as read
    markAllConversationMessagesAsRead: async (_, { conversationId, userId }) => {
      try {
        await Message.updateMany(
          {
            conversation_id: conversationId,
            sender_id: { $ne: userId }, // Only mark messages from other users as read
            read_at: null // Only update unread messages
          },
          {
            read_at: new Date(),
            updated_at: new Date()
          }
        );

        return true;
      } catch (error) {
        throw new Error(`Failed to mark conversation messages as read: ${error.message}`);
        return false;
      }
    }
  },

  Conversation: {
    // Fetch the most recent messages for a conversation
    messages: async (parent) => {
      try {
        return await Message.find({ conversation_id: parent._id })
          .sort({ sent_at: -1 })
          .limit(20);
      } catch (error) {
        throw new Error(`Failed to fetch conversation messages: ${error.message}`);
      }
    }
  }
};

module.exports = resolvers; 
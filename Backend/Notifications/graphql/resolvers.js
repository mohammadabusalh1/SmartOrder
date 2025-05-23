const Notification = require('../models/Notification');
const JSONScalar = require('./scalars/json');

const resolvers = {
  JSON: JSONScalar,
  Query: {
    // Get all notifications for a user
    notifications: async (_, { userId, limit = 20, offset = 0 }) => {
      try {
        return await Notification.find({ recipient_user_id: userId })
          .sort({ created_at: -1 })
          .skip(offset)
          .limit(limit);
      } catch (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }
    },

    // Get a specific notification by ID
    notification: async (_, { id }) => {
      try {
        return await Notification.findById(id);
      } catch (error) {
        throw new Error(`Failed to fetch notification: ${error.message}`);
      }
    },

    // Count unread notifications for a user
    unreadNotificationsCount: async (_, { userId }) => {
      try {
        return await Notification.countDocuments({
          recipient_user_id: userId,
          is_read: false
        });
      } catch (error) {
        throw new Error(`Failed to count unread notifications: ${error.message}`);
      }
    }
  },

  Mutation: {
    events: async (_, { input }) => {
    },
    // Create a new notification
    createNotification: async (_, { input }) => {
      try {
        return await Notification.create(input);
      } catch (error) {
        throw new Error(`Failed to create notification: ${error.message}`);
      }
    },

    // Mark a notification as read
    markNotificationAsRead: async (_, { id }) => {
      try {
        return await Notification.findByIdAndUpdate(
          id,
          {
            is_read: true,
            read_at: new Date(),
            updated_at: new Date()
          },
          { new: true }
        );
      } catch (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`);
      }
    },

    // Mark all notifications as read for a user
    markAllNotificationsAsRead: async (_, { userId }) => {
      try {
        await Notification.updateMany(
          {
            recipient_user_id: userId,
            is_read: false
          },
          {
            is_read: true,
            read_at: new Date(),
            updated_at: new Date()
          }
        );

        return true;
      } catch (error) {
        throw new Error(`Failed to mark all notifications as read: ${error.message}`);
        return false;
      }
    },

    // Delete a notification
    deleteNotification: async (_, { id }) => {
      try {
        const result = await Notification.deleteOne({ _id: id });
        return result.deletedCount > 0;
      } catch (error) {
        throw new Error(`Failed to delete notification: ${error.message}`);
        return false;
      }
    }
  }
};

module.exports = resolvers; 
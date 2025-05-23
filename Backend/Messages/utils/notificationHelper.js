const axios = require('axios');

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4002/graphql';

/**
 * Sends a notification when a new message is received
 * @param {Object} message - The newly created message
 * @param {Object} sender - The user who sent the message
 * @param {Object} conversation - The conversation the message belongs to
 * @returns {Promise<Object>} - The created notification
 */
async function sendMessageNotification(message, sender, conversation) {
  try {
    // Determine recipient (the user who did not send the message)
    const recipientId = String(conversation.sender_user_id) === String(message.sender_id) 
      ? conversation.receiver_user_id 
      : conversation.sender_user_id;
    
    // Create notification data
    const notificationData = {
      recipient_user_id: recipientId,
      title: `New message from ${sender.full_name}`,
      message: message.message_content.substring(0, 100) + (message.message_content.length > 100 ? '...' : ''),
      notification_type: 'message',
      related_entity_type: 'message',
      related_entity_id: message._id,
      delivery_channels: {
        push: true,
        email: false,
        sms: false
      }
    };
    
    // GraphQL mutation for creating a notification
    const mutation = `
      mutation CreateNotification($input: CreateNotificationInput!) {
        createNotification(input: $input) {
          id
          title
          message
        }
      }
    `;
    
    // Send request to the Notification service
    const response = await axios.post(NOTIFICATION_SERVICE_URL, {
      query: mutation,
      variables: {
        input: notificationData
      }
    });
    
    return response.data.data.createNotification;
  } catch (error) {
    console.error('Error sending message notification:', error.message);
    // Don't throw - we don't want message sending to fail if notification fails
    return null;
  }
}

module.exports = {
  sendMessageNotification
}; 
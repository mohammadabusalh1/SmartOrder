const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar JSON

  type Notification {
    id: ID!
    recipient_user_id: ID!
    title: String!
    message: String!
    notification_type: NotificationType!
    related_entity_type: RelatedEntityType
    related_entity_id: ID
    is_read: Boolean!
    read_at: String
    delivery_channels: DeliveryChannels
    created_at: String!
    updated_at: String!
  }

  enum NotificationType {
    order_update
    message
    promotion
    system
    payment
  }

  enum RelatedEntityType {
    order
    message
    restaurant
    payment
  }

  type DeliveryChannels {
    push: Boolean
    email: Boolean
    sms: Boolean
  }

  input DeliveryChannelsInput {
    push: Boolean
    email: Boolean
    sms: Boolean
  }

  type Query {
    notifications(userId: ID!, limit: Int, offset: Int): [Notification]
    notification(id: ID!): Notification
    unreadNotificationsCount(userId: ID!): Int
  }

  input CreateNotificationInput {
    recipient_user_id: ID!
    title: String!
    message: String!
    notification_type: NotificationType!
    related_entity_type: RelatedEntityType
    related_entity_id: ID
    delivery_channels: DeliveryChannelsInput
  }

  input EventInput {
    type: String!
    data: JSON!
  }

  type Event {
    id: ID!
    type: String!
    data: JSON!
  }

  type Mutation {
    events(input: EventInput!): Event
    createNotification(input: CreateNotificationInput!): Notification
    markNotificationAsRead(id: ID!): Notification
    markAllNotificationsAsRead(userId: ID!): Boolean
    deleteNotification(id: ID!): Boolean
  }

  type Subscription {
    notificationReceived(userId: ID!): Notification
  }
`;

module.exports = typeDefs; 
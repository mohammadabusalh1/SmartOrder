const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar JSON

  type Conversation {
    id: ID!
    order_id: ID
    sender_user_id: ID!
    receiver_user_id: ID!
    messages: [Message]
    created_at: String!
    updated_at: String!
  }

  type Message {
    id: ID!
    conversation_id: ID!
    sender_id: ID!
    message_content: String!
    attachment_url: String
    sent_at: String!
    read_at: String
    message_type: MessageType!
    created_at: String!
    updated_at: String!
  }

  enum MessageType {
    text
    image
    file
    order_update
    system
  }

  type Query {
    conversations(userId: ID!): [Conversation]
    conversation(id: ID!): Conversation
    messages(conversationId: ID!, limit: Int, offset: Int): [Message]
    unreadMessagesCount(userId: ID!): Int
  }

  input CreateConversationInput {
    order_id: ID
    sender_user_id: ID!
    receiver_user_id: ID!
  }

  input SendMessageInput {
    conversation_id: ID!
    sender_id: ID!
    message_content: String!
    attachment_url: String
    message_type: MessageType
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
    createConversation(input: CreateConversationInput!): Conversation
    sendMessage(input: SendMessageInput!): Message
    markMessageAsRead(id: ID!): Message
    markAllConversationMessagesAsRead(conversationId: ID!, userId: ID!): Boolean
  }

  type Subscription {
    messageReceived(userId: ID!): Message
    conversationUpdated(userId: ID!): Conversation
  }
`;

module.exports = typeDefs; 
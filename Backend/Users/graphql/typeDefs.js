const { gql } = require('apollo-server-express');

module.exports = gql`
  type User {
    id: ID!
    full_name: String!
    email: String!
    phone_number: String!
    user_type: String!
    profile_picture_url: String
    email_verified_at: String
    phone_verified_at: String
    status: String!
    last_login_at: String
    created_at: String!
    updated_at: String!
  }

  type AuditLog {
    log_id: ID!
    user_id: ID
    action_type: String!
    details_before: JSON
    details_after: JSON
    message: String
    ip_address: String
    user_agent: String
    timestamp: String!
  }

  scalar JSON

  type AuthResponse {
    access_token: String!
    refresh_token: String!
    expires_in: Int!
    user: User!
  }

  type TokenResponse {
    access_token: String!
    expires_in: Int!
  }

  type MessageResponse {
    message: String!
  }

  type RegisterResponse {
    message: String!
    user: User!
  }

  input RegisterInput {
    full_name: String!
    email: String!
    password: String!
    phone_number: String!
    user_type: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input ResetPasswordInput {
    reset_token: String!
    new_password: String!
  }

  input RefreshTokenInput {
    refresh_token: String!
  }

  input LogoutInput {
    refresh_token: String
  }

  input UpdateUserInput {
    full_name: String
    phone_number: String
    profile_picture_url: String
  }

  input CreateAuditLogInput {
    user_id: ID
    action_type: String!
    details_before: JSON
    details_after: JSON
    message: String
    ip_address: String
    user_agent: String
  }

  input TimeRangeInput {
    from: String!
    to: String!
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
  
  type Query {
    # Just a placeholder query, authentication primarily uses mutations
    me: User
    # Audit log queries
    auditLogs: [AuditLog!]!
    auditLogsByTimeRange(input: TimeRangeInput!): [AuditLog!]!
  }

  type Mutation {
    events(input: EventInput!): Event!
    # Auth mutations
    register(input: RegisterInput!): RegisterResponse!
    login(input: LoginInput!): AuthResponse!
    resetPassword(input: ResetPasswordInput!): MessageResponse!
    refreshToken(input: RefreshTokenInput!): TokenResponse!
    logout(input: LogoutInput): MessageResponse!
    updateUser(input: UpdateUserInput!): User!
    # Audit log mutations
    createAuditLog(input: CreateAuditLogInput!): AuditLog!
  }
`; 
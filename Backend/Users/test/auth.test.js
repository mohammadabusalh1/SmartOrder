const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const typeDefs = require('../graphql/typeDefs');
const resolvers = require('../graphql/resolvers');

// GraphQL operations
const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      access_token
      refresh_token
      expires_in
      user {
        id
        full_name
        email
        phone_number
        user_type
        status
      }
    }
  }
`;

const REFRESH_TOKEN = gql`
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      access_token
      expires_in
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      full_name
      email
      phone_number
      user_type
      status
    }
  }
`;

describe('Authentication Tests', () => {
  let server;
  let mutate;
  let query;
  let testUser;
  let refreshToken;

  beforeEach(async () => {
    // Create a test user for authentication tests
    testUser = new User({
      full_name: 'Auth Test User',
      email: 'auth.test@example.com',
      password_hash: 'TestPassword123!',
      phone_number: '+9876543210',
      user_type: 'customer',
      status: 'active'
    });
    
    await testUser.save();

    // Setup server with unauthenticated context
    const unauthServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ user: null })
    });
    
    const unauthClient = createTestClient(unauthServer);
    mutate = unauthClient.mutate;
    query = unauthClient.query;
  });

  describe('Login (FR-ACC-003)', () => {
    test('Should login with valid credentials', async () => {
      const loginInput = {
        email: 'auth.test@example.com',
        password: 'TestPassword123!'
      };
      
      const { data } = await mutate({
        mutation: LOGIN,
        variables: { input: loginInput }
      });
      
      expect(data.login).toBeDefined();
      expect(data.login.access_token).toBeDefined();
      expect(data.login.refresh_token).toBeDefined();
      expect(data.login.expires_in).toBe(3600);
      expect(data.login.user).toBeDefined();
      expect(data.login.user.email).toBe(loginInput.email);

      // Save the refresh token for later tests
      refreshToken = data.login.refresh_token;
    });

    test('Should not login with incorrect password', async () => {
      const loginInput = {
        email: 'auth.test@example.com',
        password: 'WrongPassword123!'
      };
      
      const result = await mutate({
        mutation: LOGIN,
        variables: { input: loginInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Incorrect email or password');
    });

    test('Should not login with nonexistent email', async () => {
      const loginInput = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };
      
      const result = await mutate({
        mutation: LOGIN,
        variables: { input: loginInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Incorrect email or password');
    });

    test('Should not login to an inactive account', async () => {
      // Update user status to inactive
      await User.findByIdAndUpdate(testUser._id, { status: 'inactive' });
      
      const loginInput = {
        email: 'auth.test@example.com',
        password: 'TestPassword123!'
      };
      
      const result = await mutate({
        mutation: LOGIN,
        variables: { input: loginInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('account has been deactivated');
    });
  });

  describe('Me Query (FR-ACC-005)', () => {
    test('Should get authenticated user profile', async () => {
      // Create authenticated server with user context
      const authServer = new ApolloServer({
        typeDefs,
        resolvers,
        context: () => ({ 
          user: { 
            id: testUser._id.toString(),
            email: testUser.email
          } 
        })
      });
      
      const authClient = createTestClient(authServer);
      
      const { data } = await authClient.query({ query: ME_QUERY });
      
      expect(data.me).toBeDefined();
      expect(data.me.id).toBeDefined();
      expect(data.me.email).toBe(testUser.email);
      expect(data.me.full_name).toBe(testUser.full_name);
    });

    test('Should return error when not authenticated', async () => {
      const result = await query({ query: ME_QUERY });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Not authenticated');
    });
  });

  describe('Refresh Token (FR-ACC-007)', () => {
    test('Should refresh access token with valid refresh token', async () => {
      // Login to get a refresh token
      const { data: loginData } = await mutate({
        mutation: LOGIN,
        variables: { 
          input: {
            email: 'auth.test@example.com',
            password: 'TestPassword123!'
          }
        }
      });
      
      const refreshTokenInput = {
        refresh_token: loginData.login.refresh_token
      };
      
      const { data } = await mutate({
        mutation: REFRESH_TOKEN,
        variables: { input: refreshTokenInput }
      });
      
      expect(data.refreshToken).toBeDefined();
      expect(data.refreshToken.access_token).toBeDefined();
      expect(data.refreshToken.expires_in).toBe(3600);
    });

    test('Should return error with invalid refresh token', async () => {
      const refreshTokenInput = {
        refresh_token: 'invalid-refresh-token'
      };
      
      const result = await mutate({
        mutation: REFRESH_TOKEN,
        variables: { input: refreshTokenInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Invalid or expired refresh token');
    });
  });
}); 
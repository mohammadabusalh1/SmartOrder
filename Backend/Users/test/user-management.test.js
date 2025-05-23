const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const crypto = require('crypto');
const User = require('../models/User');
const typeDefs = require('../graphql/typeDefs');
const resolvers = require('../graphql/resolvers');

// GraphQL operations
const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      message
    }
  }
`;

const LOGOUT = gql`
  mutation Logout($input: LogoutInput) {
    logout(input: $input) {
      message
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      full_name
      email
      phone_number
      profile_picture_url
    }
  }
`;

describe('User Management Tests', () => {
  let server;
  let mutate;
  let testUser;
  let refreshToken;

  beforeEach(async () => {
    // Create a test user
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    testUser = new User({
      full_name: 'Test User',
      email: 'user.management@example.com',
      password: 'TestPassword123!',
      phone_number: '+1234567890',
      user_type: 'customer',
      status: 'active',
      refresh_token: 'valid-refresh-token',
      password_reset_token: hashedResetToken,
      password_reset_expires: Date.now() + 3600000 // 1 hour from now
    });
    
    await testUser.save();

    // Generate plain reset token for tests
    testUser.plainResetToken = resetToken;

    // Setup unauthenticated server
    const unauthServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ user: null })
    });
    
    const unauthClient = createTestClient(unauthServer);
    unauthMutate = unauthClient.mutate;

    // Setup authenticated server
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
    authMutate = authClient.mutate;
  });

  describe('Reset Password (FR-ACC-004)', () => {
    test('Should reset password with valid reset token', async () => {
      const resetPasswordInput = {
        reset_token: testUser.plainResetToken,
        new_password: 'NewPassword456!'
      };
      
      const { data } = await unauthMutate({
        mutation: RESET_PASSWORD,
        variables: { input: resetPasswordInput }
      });
      
      expect(data.resetPassword).toBeDefined();
      expect(data.resetPassword.message).toContain('successfully');
      
      // Verify password has been updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.password_reset_token).toBeUndefined();
      expect(updatedUser.password_reset_expires).toBeUndefined();
    });

    test('Should return error with invalid reset token', async () => {
      const resetPasswordInput = {
        reset_token: 'invalid-reset-token',
        new_password: 'NewPassword456!'
      };
      
      const result = await unauthMutate({
        mutation: RESET_PASSWORD,
        variables: { input: resetPasswordInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Token is invalid or has expired');
    });

    test('Should return error with expired reset token', async () => {
      // Update the reset token to be expired
      await User.findByIdAndUpdate(testUser._id, {
        password_reset_expires: Date.now() - 3600000 // 1 hour ago
      });
      
      const resetPasswordInput = {
        reset_token: testUser.plainResetToken,
        new_password: 'NewPassword456!'
      };
      
      const result = await unauthMutate({
        mutation: RESET_PASSWORD,
        variables: { input: resetPasswordInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Token is invalid or has expired');
    });

    test('Should validate password strength during reset', async () => {
      const resetPasswordInput = {
        reset_token: testUser.plainResetToken,
        new_password: 'weak' // Too short
      };
      
      const result = await unauthMutate({
        mutation: RESET_PASSWORD,
        variables: { input: resetPasswordInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Password must be at least 8 characters');
    });
  });

  describe('Logout (FR-ACC-006)', () => {
    test('Should logout with refresh token', async () => {
      const logoutInput = {
        refresh_token: 'valid-refresh-token'
      };
      
      const { data } = await unauthMutate({
        mutation: LOGOUT,
        variables: { input: logoutInput }
      });
      
      expect(data.logout).toBeDefined();
      expect(data.logout.message).toContain('Successfully logged out');
      
      // Verify refresh token is cleared
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.refresh_token).toBeNull();
    });

    test('Should logout current user if authenticated (no refresh token provided)', async () => {
      const { data } = await authMutate({
        mutation: LOGOUT,
        variables: { input: {} }
      });
      
      expect(data.logout).toBeDefined();
      expect(data.logout.message).toContain('Successfully logged out');
      
      // Verify refresh token is cleared
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.refresh_token).toBeNull();
    });
  });

  describe('Update User Profile (FR-ACC-008)', () => {
    test('Should update user profile when authenticated', async () => {
      const updateInput = {
        full_name: 'Updated Name',
        phone_number: '+9999999999',
        profile_picture_url: 'https://example.com/profile.jpg'
      };
      
      const { data } = await authMutate({
        mutation: UPDATE_USER,
        variables: { input: updateInput }
      });
      
      expect(data.updateUser).toBeDefined();
      expect(data.updateUser.full_name).toBe(updateInput.full_name);
      expect(data.updateUser.phone_number).toBe(updateInput.phone_number);
      expect(data.updateUser.profile_picture_url).toBe(updateInput.profile_picture_url);
      
      // Verify database was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.full_name).toBe(updateInput.full_name);
      expect(updatedUser.phone_number).toBe(updateInput.phone_number);
      expect(updatedUser.profile_picture_url).toBe(updateInput.profile_picture_url);
    });

    test('Should return error when trying to update profile while unauthenticated', async () => {
      const updateInput = {
        full_name: 'Updated Name'
      };
      
      const result = await unauthMutate({
        mutation: UPDATE_USER,
        variables: { input: updateInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Not authenticated');
    });

    test('Should not allow changing to an existing phone number', async () => {
      // Create another user with a different phone number
      const existingUser = new User({
        full_name: 'Existing User',
        email: 'existing@example.com',
        password_hash: 'password123',
        phone_number: '+8888888888',
        user_type: 'customer',
        status: 'active'
      });
      
      await existingUser.save();
      
      // Try to update to the existing phone number
      const updateInput = {
        phone_number: '+8888888888'
      };
      
      const result = await authMutate({
        mutation: UPDATE_USER,
        variables: { input: updateInput }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Phone number already in use');
    });

    test('Should update partial fields', async () => {
      // Only update name
      const updateInput = {
        full_name: 'Only Name Updated'
      };
      
      const { data } = await authMutate({
        mutation: UPDATE_USER,
        variables: { input: updateInput }
      });
      
      expect(data.updateUser).toBeDefined();
      expect(data.updateUser.full_name).toBe(updateInput.full_name);
      expect(data.updateUser.phone_number).toBe(testUser.phone_number); // Unchanged
      
      // Verify only name was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.full_name).toBe(updateInput.full_name);
      expect(updatedUser.phone_number).toBe(testUser.phone_number);
    });
  });
}); 
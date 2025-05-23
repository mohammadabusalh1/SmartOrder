const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const User = require('../models/User');
const typeDefs = require('../graphql/typeDefs');
const resolvers = require('../graphql/resolvers');
const { PROVIDERS } = require('./mocks/socialAuth');

// Note: This file contains tests for UC-ACC-002: Social Media registration.
// Since the actual implementation would require integration with third-party OAuth providers
// like Google or Facebook, these tests focus on the internal logic that would be used
// after receiving the user data from the OAuth provider.

// Add the socialRegister mutation to the schema since it's not in the original typeDefs
const extendedTypeDefs = gql`
  ${typeDefs}
  
  input SocialAuthInput {
    provider: String!
    token: String!
    phone_number: String
    user_type: String
  }
  
  extend type Mutation {
    socialRegister(input: SocialAuthInput!): RegisterResponse!
  }
`;

// GraphQL mutations
const SOCIAL_REGISTER = gql`
  mutation SocialRegister($input: SocialAuthInput!) {
    socialRegister(input: $input) {
      message
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

// Extend the resolvers to add the socialRegister mutation
const extendedResolvers = {
  ...resolvers,
  Mutation: {
    ...resolvers.Mutation,
    
    // Add social registration resolver
    socialRegister: async (_, { input }) => {
      const { provider, token, phone_number, user_type } = input;
      
      try {
        // Using direct import to access mock without changing project structure
        const { socialRegisterOrLogin } = require('./mocks/socialAuth');
        
        const userInfo = await socialRegisterOrLogin(provider, token, {
          phone_number,
          user_type
        });
        
        if (!userInfo) {
          throw new Error('Failed to authenticate with social provider');
        }
        
        // Check if user with this email already exists
        let user = await User.findOne({ email: userInfo.email });
        
        if (user) {
          // User exists, update social ID if needed
          user.social_provider = provider;
          user.social_id = userInfo.social_id;
          await user.save();
        } else {
          // Create new user
          user = new User({
            full_name: userInfo.name,
            email: userInfo.email,
            password_hash: Math.random().toString(36).slice(-12), // Random password
            phone_number: userInfo.phone_number,
            user_type: userInfo.user_type || 'customer',
            profile_picture_url: userInfo.picture,
            email_verified_at: userInfo.verified ? new Date() : null,
            social_provider: provider,
            social_id: userInfo.social_id,
            status: 'active'
          });
          
          await user.save();
        }
        
        // Return success response
        return {
          message: 'Social authentication successful',
          user: {
            id: user._id,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            user_type: user.user_type,
            status: user.status
          }
        };
      } catch (error) {
        throw new Error(`Social authentication failed: ${error.message}`);
      }
    }
  }
};

// Mock social media user data
const mockSocialMediaUser = {
  provider: PROVIDERS.GOOGLE,
  token: 'valid-social-token',
  name: 'Google User',
  email: 'user@gmail.com'
};

describe('Social Media Registration (UC-ACC-002)', () => {
  let server;
  let mutate;
  
  beforeEach(async () => {
    // Create server with extended typeDefs and resolvers
    server = new ApolloServer({
      typeDefs: extendedTypeDefs,
      resolvers: extendedResolvers,
      context: () => ({ user: null })
    });
    
    const testClient = createTestClient(server);
    mutate = testClient.mutate;
  });
  
  test('Should register a new user with valid social media credentials', async () => {
    const socialRegisterInput = {
      provider: mockSocialMediaUser.provider,
      token: mockSocialMediaUser.token,
      phone_number: '+9876543210',
      user_type: 'customer'
    };
    
    const { data } = await mutate({
      mutation: SOCIAL_REGISTER,
      variables: { input: socialRegisterInput }
    });
    
    expect(data.socialRegister).toBeDefined();
    expect(data.socialRegister.message).toContain('successful');
    expect(data.socialRegister.user).toBeDefined();
    expect(data.socialRegister.user.full_name).toBe(mockSocialMediaUser.name);
    expect(data.socialRegister.user.email).toBe(mockSocialMediaUser.email);
    
    // Verify user was created in database
    const user = await User.findOne({ email: mockSocialMediaUser.email });
    expect(user).toBeDefined();
    expect(user.email).toBe(mockSocialMediaUser.email);
    expect(user.social_provider).toBe(mockSocialMediaUser.provider);
  });
  
  test('Should handle registration with invalid social token', async () => {
    const socialRegisterInput = {
      provider: mockSocialMediaUser.provider,
      token: 'invalid-token', // Invalid token
      phone_number: '+9876543210',
      user_type: 'customer'
    };
    
    const result = await mutate({
      mutation: SOCIAL_REGISTER,
      variables: { input: socialRegisterInput }
    });
    
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('Social authentication failed');
  });
  
  test('Should handle user with existing email from social registration', async () => {
    // First create a user with the same email
    const existingUser = new User({
      full_name: 'Existing User',
      email: mockSocialMediaUser.email, // Same email as social media user
      password_hash: 'password123',
      phone_number: '+1122334455',
      user_type: 'customer',
      status: 'active'
    });
    
    await existingUser.save();
    
    const socialRegisterInput = {
      provider: mockSocialMediaUser.provider,
      token: mockSocialMediaUser.token,
      phone_number: '+9876543210', // Different phone number
      user_type: 'customer'
    };
    
    const { data } = await mutate({
      mutation: SOCIAL_REGISTER,
      variables: { input: socialRegisterInput }
    });
    
    expect(data.socialRegister).toBeDefined();
    expect(data.socialRegister.message).toContain('successful');
    expect(data.socialRegister.user).toBeDefined();
    expect(data.socialRegister.user.email).toBe(mockSocialMediaUser.email);
    
    // Verify user was updated, not created
    const users = await User.find({ email: mockSocialMediaUser.email });
    expect(users.length).toBe(1); // Only one user with this email
    expect(users[0].social_provider).toBe(mockSocialMediaUser.provider);
  });
}); 
const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const User = require('../models/User');
const typeDefs = require('../graphql/typeDefs');
const resolvers = require('../graphql/resolvers');

// Use the exact same mutation from the resolvers test
const REGISTER_USER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
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

describe('Customer Registration (FR-ACC-001)', () => {
  let server;
  let mutate;

  beforeEach(async () => {
    // Clear the database before each test
    await User.deleteMany({});
    
    // Create a clean server for each test
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ user: null })
    });

    const testClient = createTestClient(server);
    mutate = testClient.mutate;
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
  });

  describe('UC-ACC-001: Create a New Customer Account Using Email', () => {
    test('Should register a new customer with valid information', async () => {
      const registerInput = {
        full_name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        phone_number: '+1234567890',
        user_type: 'customer',
      };

      // Check that the query executes without errors
      const { data, errors } = await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput }
      });

      expect(errors).toBeUndefined();
      expect(data).toBeDefined();
      expect(data.register).toBeDefined();
      expect(data.register.message).toContain('successful');
      expect(data.register.user).toBeDefined();
      expect(data.register.user.full_name).toBe(registerInput.full_name);
      expect(data.register.user.email).toBe(registerInput.email);
      expect(data.register.user.user_type).toBe('customer');

      // Verify user was created in database
      const user = await User.findOne({ email: registerInput.email });
      expect(user).toBeDefined();
      expect(user.email).toBe(registerInput.email);
    });

    test('Should not register a user with an existing email', async () => {
      // First create a user
      const registerInput1 = {
        full_name: 'Existing User',
        email: 'existing@example.com',
        password: 'Password123!',
        phone_number: '+9876543210',
        user_type: 'customer',
      };

      const firstRegistration = await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput1 }
      });

      // Verify first user was created successfully
      expect(firstRegistration.errors).toBeUndefined();
      expect(firstRegistration.data.register.user).toBeDefined();

      // Try to register with the same email
      const registerInput2 = {
        full_name: 'New User',
        email: 'existing@example.com', // Same email
        password: 'Password123!',
        phone_number: '+1122334455',
        user_type: 'customer',
      };

      const { data, errors } = await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput2 }
      });

      // For debugging
      if (!errors) {
        console.log('Second registration data:', data);
        // Check if first user exists in DB
        const existingUser = await User.findOne({ email: registerInput1.email });
        console.log('First user in DB:', existingUser);
      }

      expect(errors).toBeDefined();
      expect(errors[0].message).toContain('Email address already in use');
    });

    test('Should not register a user with an invalid password (too short)', async () => {
      const registerInput = {
        full_name: 'Weak Password User',
        email: 'weak@example.com',
        password: 'weak', // Less than 8 characters
        phone_number: '+1112223333',
        user_type: 'customer',
      };

      const { errors } = await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput }
      });

      expect(errors).toBeDefined();
      expect(errors[0].message).toContain('Password must be at least 8 characters');
    });

    test('Should not register a user with a duplicate phone number', async () => {
      // First create a user
      const registerInput1 = {
        full_name: 'Phone User',
        email: 'phone@example.com',
        password: 'Password123!',
        phone_number: '+5555555555',
        user_type: 'customer',
      };

      await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput1 }
      });

      // Try to register with the same phone number
      const registerInput2 = {
        full_name: 'New Phone User',
        email: 'newphone@example.com',
        password: 'Password123!',
        phone_number: '+5555555555', // Same phone number
        user_type: 'customer',
      };

      const { data, errors } = await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput2 }
      });

      expect(errors).toBeDefined();
      expect(errors[0].message).toContain('Phone number already in use');
    });
  });

  describe('BR-ACC-001, BR-ACC-002, BR-ACC-003: Business Rules', () => {
    test('BR-ACC-001: Email address must be unique', async () => {
      // First create a user
      const registerInput1 = {
        full_name: 'First User',
        email: 'unique.test@example.com',
        password: 'Password123!',
        phone_number: '+1231231230',
        user_type: 'customer',
      };

      await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput1 }
      });

      // Try to register with the same email
      const registerInput2 = {
        full_name: 'Second User',
        email: 'unique.test@example.com', // Same email
        password: 'DifferentPass123!',
        phone_number: '+3213214321',
        user_type: 'customer',
      };

      const { errors } = await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput2 }
      });

      expect(errors).toBeDefined();
      expect(errors[0].message).toContain('Email address already in use');
    });

    test('BR-ACC-002: Password must meet minimum security requirements', async () => {
      const registerInput = {
        full_name: 'Security Test User',
        email: 'security@example.com',
        password: 'pass', // Too short
        phone_number: '+9998887777',
        user_type: 'customer',
      };

      const { errors } = await mutate({
        mutation: REGISTER_USER,
        variables: { input: registerInput }
      });

      expect(errors).toBeDefined();
      expect(errors[0].message).toContain('Password must be at least 8 characters');
    });
  });
}); 
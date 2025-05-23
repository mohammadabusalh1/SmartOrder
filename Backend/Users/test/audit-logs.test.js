const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const gql = require('graphql-tag');
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const typeDefs = require('../graphql/typeDefs');
const resolvers = require('../graphql/resolvers');

// GraphQL operations
const CREATE_AUDIT_LOG = gql`
  mutation CreateAuditLog($input: CreateAuditLogInput!) {
    createAuditLog(input: $input) {
      log_id
      user_id
      action_type
      message
      ip_address
      user_agent
      timestamp
    }
  }
`;

const GET_AUDIT_LOGS = gql`
  query GetAuditLogs {
    auditLogs {
      log_id
      user_id
      action_type
      message
      timestamp
    }
  }
`;

const GET_AUDIT_LOGS_BY_TIME_RANGE = gql`
  query GetAuditLogsByTimeRange($input: TimeRangeInput!) {
    auditLogsByTimeRange(input: $input) {
      log_id
      user_id
      action_type
      message
      timestamp
    }
  }
`;

describe('AuditLog Tests', () => {
  let adminUser;
  let regularUser;
  let adminServer;
  let regularUserServer;
  let unauthServer;
  let adminClient;
  let regularUserClient;
  let unauthClient;

  beforeAll(async () => {
    // Create test users
    adminUser = new User({
      full_name: 'Admin Test User',
      email: 'admin.test@example.com',
      password_hash: 'TestPassword123!',
      phone_number: '+12345678901',
      user_type: 'admin',
      status: 'active'
    });
    
    regularUser = new User({
      full_name: 'Regular Test User',
      email: 'regular.test@example.com',
      password_hash: 'TestPassword123!',
      phone_number: '+12345678902',
      user_type: 'customer',
      status: 'active'
    });
    
    await adminUser.save();
    await regularUser.save();

    // Setup servers with different authentication contexts
    adminServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ 
        user: { 
          id: adminUser._id.toString(),
          email: adminUser.email,
          user_type: 'admin'
        },
        req: {
          ip: '127.0.0.1',
          headers: {
            'user-agent': 'Jest Test Agent'
          }
        }
      })
    });
    
    regularUserServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ 
        user: { 
          id: regularUser._id.toString(),
          email: regularUser.email,
          user_type: 'customer'
        },
        req: {
          ip: '127.0.0.1',
          headers: {
            'user-agent': 'Jest Test Agent'
          }
        }
      })
    });
    
    unauthServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ user: null })
    });
    
    adminClient = createTestClient(adminServer);
    regularUserClient = createTestClient(regularUserServer);
    unauthClient = createTestClient(unauthServer);
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ 
      email: { $in: ['admin.test@example.com', 'regular.test@example.com'] }
    });
    await AuditLog.deleteMany({});
  });

  describe('Create Audit Log', () => {
    test('Should create an audit log with valid input', async () => {
      const input = {
        action_type: 'LOGIN',
        message: 'User logged in successfully',
        details_before: { status: 'logged_out' },
        details_after: { status: 'logged_in' }
      };
      
      const { data } = await regularUserClient.mutate({
        mutation: CREATE_AUDIT_LOG,
        variables: { input }
      });
      
      expect(data.createAuditLog).toBeDefined();
      expect(data.createAuditLog.log_id).toBeDefined();
      expect(data.createAuditLog.action_type).toBe(input.action_type);
      expect(data.createAuditLog.message).toBe(input.message);
      expect(data.createAuditLog.user_id).toBe(regularUser._id.toString());
      expect(data.createAuditLog.ip_address).toBe('127.0.0.1');
      expect(data.createAuditLog.user_agent).toBe('Jest Test Agent');
    });

    test('Should create an audit log without optional fields', async () => {
      const input = {
        action_type: 'SYSTEM_EVENT',
      };
      
      const { data } = await adminClient.mutate({
        mutation: CREATE_AUDIT_LOG,
        variables: { input }
      });
      
      expect(data.createAuditLog).toBeDefined();
      expect(data.createAuditLog.log_id).toBeDefined();
      expect(data.createAuditLog.action_type).toBe(input.action_type);
      expect(data.createAuditLog.user_id).toBe(adminUser._id.toString());
    });

    test('Should create an audit log even when unauthenticated', async () => {
      const input = {
        action_type: 'PUBLIC_ACTION',
        message: 'Action from unauthenticated user'
      };
      
      const { data } = await unauthClient.mutate({
        mutation: CREATE_AUDIT_LOG,
        variables: { input }
      });
      
      expect(data.createAuditLog).toBeDefined();
      expect(data.createAuditLog.log_id).toBeDefined();
      expect(data.createAuditLog.action_type).toBe(input.action_type);
      expect(data.createAuditLog.message).toBe(input.message);
      expect(data.createAuditLog.user_id).toBeNull();
    });
  });

  describe('Get All Audit Logs', () => {
    beforeAll(async () => {
      // Create some additional test logs
      await AuditLog.createLog({
        user_id: regularUser._id,
        action_type: 'UPDATE_PROFILE',
        message: 'User updated profile',
        timestamp: new Date('2023-01-01T12:00:00Z')
      });
      
      await AuditLog.createLog({
        user_id: adminUser._id,
        action_type: 'DELETE_ITEM',
        message: 'Admin deleted a menu item',
        timestamp: new Date('2023-01-02T12:00:00Z')
      });
    });

    test('Should get all audit logs when authenticated as admin', async () => {
      // Create a user with admin privileges just for this test
      const adminTestUser = new User({
        full_name: 'Admin For Query Test',
        email: 'admin.query@example.com',
        password_hash: 'TestPassword123!',
        phone_number: '+12345678903',
        user_type: 'admin',
        status: 'active'
      });
      
      await adminTestUser.save();
      
      // Create server with the admin user context
      const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: () => ({ 
          user: { 
            id: adminTestUser._id.toString(),
            email: adminTestUser.email,
            user_type: 'admin'
          }
        })
      });
      
      const client = createTestClient(server);
      
      const { data } = await client.query({
        query: GET_AUDIT_LOGS
      });
      
      expect(data.auditLogs).toBeDefined();
      expect(Array.isArray(data.auditLogs)).toBe(true);
      expect(data.auditLogs.length).toBeGreaterThanOrEqual(2);
      
      // Clean up
      await User.deleteOne({ email: 'admin.query@example.com' });
    });

    test('Should not allow regular users to get all audit logs', async () => {
      const result = await regularUserClient.query({
        query: GET_AUDIT_LOGS
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Insufficient permissions');
    });

    test('Should not allow unauthenticated requests to get all audit logs', async () => {
      const result = await unauthClient.query({
        query: GET_AUDIT_LOGS
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Not authenticated');
    });
  });

  describe('Get Audit Logs By Time Range', () => {
    beforeAll(async () => {
      // Create some additional test logs with specific timestamps
      await AuditLog.createLog({
        action_type: 'TEST_ACTION_1',
        message: 'Test action 1',
        timestamp: new Date('2023-02-01T10:00:00Z')
      });
      
      await AuditLog.createLog({
        action_type: 'TEST_ACTION_2',
        message: 'Test action 2',
        timestamp: new Date('2023-02-15T10:00:00Z')
      });
      
      await AuditLog.createLog({
        action_type: 'TEST_ACTION_3',
        message: 'Test action 3',
        timestamp: new Date('2023-03-01T10:00:00Z')
      });
    });

    test('Should get audit logs for a specific time range', async () => {
      // Create a user with admin privileges just for this test
      const adminTestUser = new User({
        full_name: 'Admin For Time Range Test',
        email: 'admin.timerange@example.com',
        password_hash: 'TestPassword123!',
        phone_number: '+12345678904',
        user_type: 'admin',
        status: 'active'
      });
      
      await adminTestUser.save();
      
      // Create server with the admin user context
      const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: () => ({ 
          user: { 
            id: adminTestUser._id.toString(),
            email: adminTestUser.email,
            user_type: 'admin'
          }
        })
      });
      
      const client = createTestClient(server);
      
      const input = {
        from: '2023-02-01T00:00:00Z',
        to: '2023-02-28T23:59:59Z'
      };
      
      const { data } = await client.query({
        query: GET_AUDIT_LOGS_BY_TIME_RANGE,
        variables: { input }
      });
      
      expect(data.auditLogsByTimeRange).toBeDefined();
      expect(Array.isArray(data.auditLogsByTimeRange)).toBe(true);
      
      // Should include logs from February only
      const febLogs = data.auditLogsByTimeRange.filter(log => 
        log.action_type === 'TEST_ACTION_1' || log.action_type === 'TEST_ACTION_2'
      );
      expect(febLogs.length).toBe(2);
      
      // Should not include logs from March
      const marchLogs = data.auditLogsByTimeRange.filter(log => 
        log.action_type === 'TEST_ACTION_3'
      );
      expect(marchLogs.length).toBe(0);
      
      // Clean up
      await User.deleteOne({ email: 'admin.timerange@example.com' });
    });

    test('Should handle invalid date formats', async () => {
      const input = {
        from: 'invalid-date',
        to: '2023-02-28T23:59:59Z'
      };
      
      const result = await adminClient.query({
        query: GET_AUDIT_LOGS_BY_TIME_RANGE,
        variables: { input }
      });
      
      expect(result.errors).toBeDefined();
    });

    test('Should not allow regular users to get audit logs by time range', async () => {
      const input = {
        from: '2023-02-01T00:00:00Z',
        to: '2023-02-28T23:59:59Z'
      };
      
      const result = await regularUserClient.query({
        query: GET_AUDIT_LOGS_BY_TIME_RANGE,
        variables: { input }
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Insufficient permissions');
    });
  });
}); 
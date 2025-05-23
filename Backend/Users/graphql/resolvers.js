const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { UserInputError, AuthenticationError } = require('apollo-server-express');
const crypto = require('crypto');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractUserData
} = require('../utils/auth');
const { GraphQLScalarType, Kind } = require('graphql');

// Define JSON scalar type for handling JSON objects
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'The JSON scalar type represents JSON objects as specified by ECMA-404',
  serialize(value) {
    return value; // Already a JSON object when going out
  },
  parseValue(value) {
    return value; // Already a JSON object when coming in
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT) {
      // Convert object literal to JSON
      return ast.fields.reduce((obj, field) => {
        obj[field.name.value] = field.value.value;
        return obj;
      }, {});
    }
    return null;
  }
});

module.exports = {
  JSON: JSONScalar,

  Query: {
    /**
     * Retrieve the authenticated user's profile
     *
     * @requires Authentication
     *
     * @returns {Object} User profile with id, full_name, email, user_type, profile_picture_url, status, and last_login_at
     * @throws {AuthenticationError} If not authenticated or user not found
     */
    me: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }

      const userDoc = await User.findById(user.id);
      if (!userDoc) {
        throw new AuthenticationError('User not found');
      }

      return extractUserData(userDoc);
    },

    /**
     * Retrieve all audit logs
     * 
     * @requires Authentication with admin privileges
     * 
     * @returns {Array} List of audit logs
     * @throws {AuthenticationError} If not authenticated or not an admin
     */
    auditLogs: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Check if user is admin
      const userDoc = await User.findById(user.id);
      if (!userDoc || userDoc.user_type !== 'admin') {
        throw new AuthenticationError('Insufficient permissions');
      }

      return await AuditLog.getAllLogs();
    },

    /**
     * Retrieve audit logs within a specific time range
     * 
     * @requires Authentication with admin privileges
     * 
     * @param {Object} input - Time range input
     * @param {String} input.from - Start date/time in ISO format
     * @param {String} input.to - End date/time in ISO format
     * 
     * @returns {Array} List of audit logs within the specified time range
     * @throws {AuthenticationError} If not authenticated or not an admin
     * @throws {UserInputError} If date format is invalid
     */
    auditLogsByTimeRange: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Check if user is admin
      const userDoc = await User.findById(user.id);
      if (!userDoc || userDoc.user_type !== 'admin') {
        throw new AuthenticationError('Insufficient permissions');
      }

      const { from, to } = input;

      // Validate date formats
      try {
        new Date(from);
        new Date(to);
      } catch (error) {
        throw new UserInputError('Invalid date format');
      }

      return await AuditLog.getLogsByTimeRange(from, to);
    }
  },

  Mutation: {
    events: async (_, { input }) => {
    },
    // Register a new user
    register: async (_, { input }) => {
      const { full_name, email, password, phone_number, user_type } = input;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { phone_number: phone_number }]
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new UserInputError('Email address already in use');
        }
        if (existingUser.phone_number === phone_number) {
          throw new UserInputError('Phone number already in use');
        }
      }

      // Validate password strength
      if (password.length < 8) {
        throw new UserInputError('Password must be at least 8 characters long');
      }

      // Create new user
      const user = new User({
        full_name: full_name,
        email,
        password_hash: password, // The User model will hash this
        phone_number: phone_number,
        user_type: ['customer', 'restaurant_owner'].includes(user_type) ? user_type : 'customer',
        status: 'active' // Set to active initially, can change based on requirements
      });

      // Save user to database
      await user.save();

      // TODO: Send verification email (implementation dependent on email service)

      return {
        message: 'User registration was successful. Please check your email.',
        user: extractUserData(user)
      };
    },

    // Login user
    login: async (_, { input }) => {
      const { email, password } = input;

      // Find user by email
      const user = await User.findOne({ email }).select('+password_hash');

      // Check if user exists and password is correct
      if (!user || !(await user.comparePassword(password))) {
        throw new UserInputError('Incorrect email or password');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new AuthenticationError('Your account has been deactivated or is pending activation');
      }

      // Update last login timestamp
      user.last_login_at = new Date();

      // Generate tokens
      const access_token = generateAccessToken(user);
      const refresh_token = generateRefreshToken(user);

      // Save refresh token in database
      user.refresh_token = refresh_token;
      await user.save({ validateBeforeSave: false });

      return {
        access_token,
        refresh_token,
        expires_in: 3600, // 1 hour in seconds
        user: extractUserData(user)
      };
    },

    // Reset password
    resetPassword: async (_, { input }) => {
      const { reset_token, new_password } = input;

      // Hash the token for comparison with stored token
      const hashed_token = crypto
        .createHash('sha256')
        .update(reset_token)
        .digest('hex');

      // Find user with this token that hasn't expired
      const user = await User.findOne({
        password_reset_token: hashed_token,
        password_reset_expires: { $gt: Date.now() }
      });

      // If no user found or token expired
      if (!user) {
        throw new UserInputError('Token is invalid or has expired');
      }

      // Validate password strength
      if (new_password.length < 8) {
        throw new UserInputError('Password must be at least 8 characters long');
      }

      // Set new password and clear reset token fields
      user.password = new_password;
      user.password_reset_token = undefined;
      user.password_reset_expires = undefined;

      await user.save();

      return {
        message: 'Your password was reset successfully. You can now log in with the new password.'
      };
    },

    // Refresh token
    refreshToken: async (_, { input }) => {
      const { refresh_token } = input;

      // Verify refresh token
      const decoded = verifyRefreshToken(refresh_token);
      if (!decoded) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Find user with this refresh token
      const user = await User.findOne({
        _id: decoded.id,
        refresh_token: refresh_token
      });

      if (!user) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Generate new access token
      const access_token = generateAccessToken(user);

      return {
        access_token,
        expires_in: 3600 // 1 hour in seconds
      };
    },

    // Logout
    logout: async (_, { input }, { user }) => {
      if (input && input.refresh_token) {
        // Find user with this refresh token and clear it
        await User.findOneAndUpdate(
          { refresh_token: input.refresh_token },
          { $set: { refresh_token: null } }
        );
      } else if (user && user.id) {
        // If authenticated, clear refresh token
        await User.findByIdAndUpdate(
          user.id,
          { $set: { refresh_token: null } }
        );
      }

      return {
        message: 'Successfully logged out.'
      };
    },

    // Update user profile
    updateUser: async (_, { input }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }

      const { full_name, phone_number, profile_picture_url } = input;

      // Find user
      const userDoc = await User.findById(user.id);
      if (!userDoc) {
        throw new AuthenticationError('User not found');
      }

      // If phone number is being updated, check if it's already in use
      if (phone_number && phone_number !== userDoc.phone_number) {
        const existingUser = await User.findOne({ phone_number });
        if (existingUser) {
          throw new UserInputError('Phone number already in use');
        }
      }

      // Update fields
      if (full_name) userDoc.full_name = full_name;
      if (phone_number) userDoc.phone_number = phone_number;
      if (profile_picture_url) userDoc.profile_picture_url = profile_picture_url;

      // Save changes
      await userDoc.save();

      return extractUserData(userDoc);
    },

    /**
     * Create a new audit log entry
     * 
     * @param {Object} input - Audit log data
     * 
     * @returns {Object} Created audit log entry
     */
    createAuditLog: async (_, { input }, { user, req }) => {
      // Include current user ID if authenticated but no user_id provided
      if (user && !input.user_id) {
        input.user_id = user.id;
      }

      // Capture IP address from request if available and not provided
      if (!input.ip_address && req && req.ip) {
        input.ip_address = req.ip;
      }

      // Capture user agent from request if available and not provided
      if (!input.user_agent && req && req.headers && req.headers['user-agent']) {
        input.user_agent = req.headers['user-agent'];
      }

      // Set timestamp to current time if not provided
      if (!input.timestamp) {
        input.timestamp = new Date();
      }

      // Create the audit log
      return await AuditLog.createLog(input);
    }
  }
}; 
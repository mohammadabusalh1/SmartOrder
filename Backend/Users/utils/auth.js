const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a JWT access token for a user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateAccessToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    user_type: user.user_type
  };
  
  // In a real app, these values would come from environment variables
  const secret = process.env.JWT_SECRET || 'test-jwt-secret';
  const expiry = process.env.JWT_EXPIRY || '1h';
  
  return jwt.sign(payload, secret, { expiresIn: expiry });
};

/**
 * Generate a refresh token for a user
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user._id || user.id,
    version: Date.now() // To invalidate all tokens when needed
  };
  
  // In a real app, these values would come from environment variables
  const secret = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
  const expiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  
  return jwt.sign(payload, secret, { expiresIn: expiry });
};

/**
 * Verify a refresh token
 * @param {String} token - Refresh token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyRefreshToken = (token) => {
  try {
    // In a real app, this value would come from an environment variable
    const secret = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
    
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

/**
 * Extract safe user data for responses
 * @param {Object} user - User document
 * @returns {Object} User data with sensitive fields removed
 */
const extractUserData = (user) => {
  // Convert mongoose document to plain object if needed
  const userData = user.toObject ? user.toObject() : { ...user };
  
  // Always explicitly set id for consistent response
  userData.id = userData._id || userData.id;
  
  // Remove sensitive fields
  delete userData._id;
  delete userData.__v;
  delete userData.password_hash;
  
  return userData;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractUserData
}; 
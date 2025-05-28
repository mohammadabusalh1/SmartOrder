const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('apollo-server-express');

const validateToken = (token) => {
  if (!token) {
    return null;
  }

  try {
    // Remove "Bearer " prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return {
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin
    };
  } catch (err) {
    return null;
  }
};

const requireAuth = (user) => {
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }
  return user;
};

const requireAdmin = (user) => {
  if (!user || !user.isAdmin) {
    throw new AuthenticationError('Admin privileges required');
  }
  return user;
};

module.exports = {
  validateToken,
  requireAuth,
  requireAdmin
}; 
/**
 * Mock utilities for social authentication testing
 */

// Mock social media providers
const PROVIDERS = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple'
};

// Mock user info based on provider and token
const mockUserInfo = (provider, token) => {
  // Valid token for testing
  if (token === 'valid-social-token') {
    switch(provider) {
      case PROVIDERS.GOOGLE:
        return {
          id: 'google-123456',
          email: 'user@gmail.com',
          name: 'Google User',
          picture: 'https://example.com/google-profile.jpg',
          verified: true
        };
      case PROVIDERS.FACEBOOK:
        return {
          id: 'facebook-123456',
          email: 'user@facebook.com',
          name: 'Facebook User',
          picture: 'https://example.com/facebook-profile.jpg',
          verified: true
        };
      case PROVIDERS.APPLE:
        return {
          id: 'apple-123456',
          email: 'user@icloud.com',
          name: 'Apple User',
          verified: true
        };
      default:
        return null;
    }
  }
  
  // Return null for invalid tokens
  return null;
};

// Mock verification function for social tokens
const verifySocialToken = async (provider, token) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 10));
  
  return mockUserInfo(provider, token);
};

// Mock social registration process
const socialRegisterOrLogin = async (provider, token, extraData = {}) => {
  const userInfo = await verifySocialToken(provider, token);
  
  if (!userInfo) {
    throw new Error('Invalid social token');
  }
  
  // Return user info with additional fields needed for our system
  return {
    ...userInfo,
    phone_number: extraData.phone_number || '+1234567890',
    user_type: extraData.user_type || 'customer',
    social_provider: provider,
    social_id: userInfo.id
  };
};

module.exports = {
  PROVIDERS,
  verifySocialToken,
  socialRegisterOrLogin
}; 
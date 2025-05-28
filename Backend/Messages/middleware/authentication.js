const jwt = require('jsonwebtoken');

// Authentication function for GraphQL context
exports.authentication = (token) => {
    if (!token || !token.startsWith('Bearer ')) {
        return null;
    }

    try {
        const jwtToken = token.split(' ')[1];
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
        return { id: decoded.id, user_type: decoded.userType, email: decoded.email };
    } catch (error) {
        return null;
    }

}; 
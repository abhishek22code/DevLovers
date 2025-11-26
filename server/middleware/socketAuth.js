const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    // Attach user to socket
    socket.userId = user._id.toString();
    socket.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    next(new Error('Authentication error: ' + error.message));
  }
};

module.exports = socketAuth;









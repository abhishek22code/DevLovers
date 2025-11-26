const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');

// Load messages routes with error handling
let messagesRoutes;
try {
  messagesRoutes = require('./routes/messages');
  console.log('✅ Messages routes module loaded successfully');
} catch (e) {
  console.error('❌ Error loading messages routes:', e);
  messagesRoutes = null;
}

let runnerRoutes;
try {
  runnerRoutes = require('./routes/runner');
} catch (e) {}

const app = express();
const server = http.createServer(app);
// PORT configuration - use environment variable or default
// In development: Vite uses 3000, so server should use 3001
// In production: Use PORT from environment (set by hosting provider)
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
let PORT = process.env.PORT || (isDevelopment ? 3001 : 5000);

// Only force 3001 in development if PORT conflicts with Vite
if (isDevelopment && (PORT === 3000 || PORT === '3000')) {
  console.error('⚠️  WARNING: PORT was set to 3000, but server must run on 3001 in development!');
  console.error('⚠️  Vite dev server uses port 3000. Forcing server to port 3001...');
  PORT = 3001;
}

// Middleware
app.use(helmet());

// Add compression middleware for faster responses
const compression = require('compression');
app.use(compression({
  level: 6, // Compression level (1-9, 6 is a good balance)
  filter: (req, res) => {
    // Compress responses larger than 1KB
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
// CORS - Configure based on environment
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : (isDevelopment 
      ? [
          process.env.CLIENT_URL || 'http://localhost:3000',
          process.env.CLIENT_URL_ALT || 'http://127.0.0.1:3000'
        ] // Development origins
      : []); // Production: must set ALLOWED_ORIGINS env var

app.use(cors({
  origin: isDevelopment || allowedOrigins.length === 0
    ? true // Allow all in development, or if no origins specified
    : (origin, callback) => {
        // In production, check if origin is allowed
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
  credentials: true // Allow cookies/credentials
}));
app.use(morgan(isDevelopment ? 'combined' : 'common')); // Less verbose in production
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Debug middleware - only in development
if (isDevelopment) {
  app.use('/api/messages', (req, res, next) => {
    console.log(`\n🔍 [DEBUG] ${req.method} ${req.originalUrl}`);
    console.log(`🔍 [DEBUG] Request path: ${req.path}, Original URL: ${req.originalUrl}`);
    console.log(`🔍 [DEBUG] Base URL: ${req.baseUrl}`);
    next();
  });
}

// Rate limiting configuration (isDevelopment already defined above)

console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Rate limiting: ${isDevelopment ? 'DISABLED (development mode)' : 'ENABLED (production mode)'}`);

// General rate limiter (very lenient limits, disabled in development)
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute (very high for development)
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Always skip in development
    if (isDevelopment) {
      return true;
    }
    // In production, skip health checks
    return req.path === '/api/health';
  },
});

// Auth route rate limiter (very lenient, disabled in development)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // Allow 500 login attempts per minute (very high for development)
  message: 'Too many login attempts. Please wait a minute and try again.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip in development - no rate limiting during development
  // Store rate limit info in response headers
  handler: (req, res) => {
    const resetTime = new Date(Date.now() + 1 * 60 * 1000);
    res.status(429).json({
      message: 'Too many login attempts. Please wait a minute before trying again.',
      retryAfter: 60, // seconds
      resetTime: resetTime.toISOString()
    });
  }
});

// Apply rate limiting (only in production - completely disabled in development)
if (!isDevelopment) {
  app.use('/api/auth', authLimiter);
  app.use('/api', generalLimiter);
  console.log('✅ Rate limiting ENABLED for production');
} else {
  console.log('✅ Rate limiting DISABLED for development');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationsRoutes);

// Test routes BEFORE messages routes to verify server is working
app.get('/api/test-messages', (req, res) => {
  res.json({ message: 'Messages routes are registered', timestamp: new Date().toISOString() });
});

// Register messages routes with error handling
// IMPORTANT: Register direct routes FIRST to ensure they work
const { getConversations, getMessages, sendMessage, markAsRead, getUnreadCount } = require('./controllers/messagesController');
const auth = require('./middleware/auth');

// Register direct routes FIRST (these take precedence)
console.log('\n📝 Registering direct message routes...');
app.get('/api/messages/conversations', (req, res, next) => {
  console.log('🔍 [ROUTE] GET /api/messages/conversations - Direct route matched!');
  next();
}, auth, getConversations);
app.get('/api/messages/unread/count', auth, getUnreadCount);
app.post('/api/messages/send', auth, sendMessage);
app.post('/api/messages/read', auth, markAsRead);

app.get('/api/messages/:userId', auth, getMessages);
console.log('✅ Direct message routes registered:');
console.log('   GET  /api/messages/conversations');
console.log('   GET  /api/messages/unread/count');
console.log('   POST /api/messages/send');
console.log('   POST /api/messages/read');
console.log('   GET  /api/messages/:userId');
console.log('');

// Also register via router (for consistency, but direct routes take precedence)
if (messagesRoutes) {
  console.log('📝 Also registering messages router...');
  app.use('/api/messages', messagesRoutes);
  console.log('✅ Messages router also registered at /api/messages');
  
  // Verify route registration by checking router stack
  const messagesRouter = messagesRoutes;
  if (messagesRouter && messagesRouter.stack) {
    console.log(`📊 Messages router has ${messagesRouter.stack.length} routes registered`);
  }
} else {
  console.warn('⚠️  Messages router not available, but direct routes are registered');
}

// Debug: Log all registered routes
console.log('📋 Registered routes:');
console.log('  GET  /api/messages/conversations');
console.log('  GET  /api/messages/unread/count');
console.log('  POST /api/messages/send');
console.log('  POST /api/messages/read');
console.log('  GET  /api/messages/:userId');
// Conditionally enable code runner
if (process.env.FEATURE_CODE_RUNNER === 'true' && runnerRoutes) {
  app.use('/api/runner', runnerRoutes);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DevLovers API is running' });
});

// Initialize Socket.IO
let io;
try {
  const { Server } = require('socket.io');
  const socketAuth = require('./middleware/socketAuth');
  const User = require('./models/User');
  
  // Socket.IO CORS configuration
  const socketCorsOrigins = process.env.SOCKET_CORS_ORIGINS
    ? process.env.SOCKET_CORS_ORIGINS.split(',').map(origin => origin.trim())
    : (isDevelopment
        ? [
            process.env.CLIENT_URL || 'http://localhost:3000',
            process.env.CLIENT_URL_ALT || 'http://127.0.0.1:3000',
            new RegExp(`https?://.*${process.env.LOCALHOST_HOSTNAME || 'localhost'}:\\d+`),
          ]
        : allowedOrigins); // Use same origins as CORS in production

  io = new Server(server, {
    cors: {
      origin: isDevelopment || socketCorsOrigins.length === 0
        ? socketCorsOrigins // Allow development origins or all if not specified
        : socketCorsOrigins, // Use specified origins in production
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    }
  });

  // Apply authentication middleware
  io.use(socketAuth);

  // Store active users (userId -> socketId[])
  const activeUsers = new Map();

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const username = socket.user?.username || 'Unknown';
    
    console.log(`🔌 User connected: ${username} (${userId})`);
    
    // Add user to active users
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, []);
    }
    activeUsers.get(userId).push(socket.id);
    
    // Update user's online status
    await User.findByIdAndUpdate(userId, { 
      isOnline: true,
      lastSeen: new Date()
    });
    
    // Join user's personal room
    socket.join(userId);
    
    // Get user's mutual follows to notify them
    const currentUser = await User.findById(userId).select('following');
    if (currentUser && currentUser.following) {
      // Notify mutual follows that this user is online
      const mutualFollows = await User.find({
        _id: { $in: currentUser.following },
        following: userId
      }).select('_id');
      
      mutualFollows.forEach(follow => {
        io.to(follow._id.toString()).emit('userOnline', { userId });
      });
    }
    
    // Handle get online status request
    socket.on('getOnlineStatus', async (data) => {
      const { userIds } = data;
      if (userIds && Array.isArray(userIds)) {
        const onlineUserIds = [];
        for (const uid of userIds) {
          if (activeUsers.has(uid.toString())) {
            onlineUserIds.push(uid.toString());
          }
        }
        socket.emit('onlineStatus', { onlineUsers: onlineUserIds });
      }
    });

    // Handle typing indicators
    socket.on('typing', async (data) => {
      const { receiverId, isTyping } = data;
      if (receiverId && userId) {
        // Check mutual follow before allowing typing indicator
        const Message = require('./models/Message');
        const User = require('./models/User');
        const user1 = await User.findById(userId).select('following');
        const user2 = await User.findById(receiverId).select('following');
        
        if (user1 && user2) {
          const user1FollowsUser2 = user1.following.some(
            id => id.toString() === receiverId.toString()
          );
          const user2FollowsUser1 = user2.following.some(
            id => id.toString() === userId.toString()
          );
          
          if (user1FollowsUser2 && user2FollowsUser1) {
            socket.to(receiverId).emit('typing', {
              senderId: userId,
              isTyping
            });
          }
        }
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${username} (${userId})`);
      
      // Remove socket from active users
      const sockets = activeUsers.get(userId);
      if (sockets) {
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        
        // If no more sockets for this user, mark as offline
        if (sockets.length === 0) {
          activeUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { 
            isOnline: false,
            lastSeen: new Date()
          });
          
          // Notify mutual follows that this user is offline
          const currentUser = await User.findById(userId).select('following');
          if (currentUser && currentUser.following) {
            const mutualFollows = await User.find({
              _id: { $in: currentUser.following },
              following: userId
            }).select('_id');
            
            mutualFollows.forEach(follow => {
              io.to(follow._id.toString()).emit('userOffline', { userId });
            });
          }
        }
      }
    });
  });

  // Make io accessible in routes via req.app.get('io')
  app.set('io', io);
} catch (e) {
  console.error('Socket.IO failed to initialize:', e.message);
}

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error("❌ No MongoDB URI found. Please set MONGODB_URI in your .env file");
  process.exit(1);
}

// Global error handler middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error('❌ Global error handler caught error:');
  console.error('❌ Error:', err);
  console.error('❌ Stack:', err.stack);
  console.error('❌ URL:', req.originalUrl);
  console.error('❌ Method:', req.method);
  
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: message,
    message: process.env.NODE_ENV === 'development' ? message : 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err
    })
  });
});

// Handle 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found` 
  });
});

mongoose
  .connect(mongoURI)
  .then((conn) => {
    // Allow an environment-provided friendly name for logs so we don't have to
    // show the Atlas shard host (e.g. ac-unznoxh-shard-00-00.hkjdugc.mongodb.net)
    // This does NOT change the actual connection host — it's purely for display.
    const mongoHostAlias = process.env.MONGODB_HOST_ALIAS || conn.connection.host;
    console.log(`✅ Connected to MongoDB: ${mongoHostAlias}`);
    if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
      // Listen on all network interfaces (0.0.0.0) to allow access from mobile devices
      server.listen(PORT, '0.0.0.0', () => {
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        const defaultLocalhost = process.env.LOCALHOST_HOSTNAME || 'localhost';
        let localIP = defaultLocalhost;
        
        // Find the first non-internal IPv4 address
        for (const interfaceName in networkInterfaces) {
          const addresses = networkInterfaces[interfaceName];
          for (const address of addresses) {
            if (address.family === 'IPv4' && !address.internal) {
              localIP = address.address;
              break;
            }
          }
          if (localIP !== defaultLocalhost) break;
        }
        
        console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        if (isDevelopment) {
          const localhostHost = process.env.LOCALHOST_HOSTNAME || 'localhost';
          console.log(`🌐 API available at http://${localhostHost}:${PORT}/api`);
          console.log(`📱 Access from your phone: http://${localIP}:${PORT}/api`);
          console.log(`🌍 Network access: http://0.0.0.0:${PORT}/api`);
          console.log(`🏥 Health check: http://${localhostHost}:${PORT}/api/health`);
          console.log(`📱 Phone health check: http://${localIP}:${PORT}/api/health`);
        } else {
          console.log(`🌐 API available at http://0.0.0.0:${PORT}/api`);
          console.log(`🏥 Health check: http://0.0.0.0:${PORT}/api/health`);
          if (process.env.DOMAIN) {
            console.log(`🌍 Production domain: ${process.env.DOMAIN}`);
          }
        }
      });
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;

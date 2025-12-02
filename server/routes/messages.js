const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount
} = require('../controllers/messagesController');

// Test route without auth to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Messages router is working', path: req.path, timestamp: new Date().toISOString() });
});

// Debug route to check all messages in database
router.get('/debug/all', auth, async (req, res) => {
  try {
    const Message = require('../models/Message');
    const userId = req.user._id.toString();
    
    const allMessages = await Message.find({}).sort({ createdAt: -1 }).limit(100).lean();
    const userMessages = allMessages.filter(m => {
      const senderStr = String(m.sender || m.sender?._id || '');
      const receiverStr = String(m.receiver || m.receiver?._id || '');
      return senderStr === userId || receiverStr === userId;
    });
    
    res.json({ 
      totalInDatabase: allMessages.length,
      totalForUser: userMessages.length,
      currentUserId: userId,
      sampleMessages: userMessages.slice(0, 20).map(m => ({
        _id: String(m._id),
        sender: String(m.sender),
        receiver: String(m.receiver),
        senderType: typeof m.sender,
        receiverType: typeof m.receiver,
        content: m.content?.substring(0, 50),
        deleted: m.deleted,
        createdAt: m.createdAt,
        isForCurrentUser: String(m.sender) === userId || String(m.receiver) === userId
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for the current user (must be before /:userId and auth)
// This route requires authentication
router.get('/conversations', auth, getConversations);

// Get unread message count (must come before /:userId to avoid route conflicts)
router.get('/unread/count', auth, getUnreadCount);

// Send a message
router.post('/send', auth, sendMessage);

// Mark messages as read
router.post('/read', auth, markAsRead);

// Get messages between current user and another user (must be last to avoid catching other routes)
router.get('/:userId', auth, getMessages);

module.exports = router;






const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Create a notification
exports.createNotification = async (userId, type, fromUserId) => {
  try {
    const notification = new Notification({
      user: userId,
      type: type,
      fromUser: fromUserId,
      read: false
    });
    await notification.save();
    
    // Populate fromUser for socket emission
    await notification.populate('fromUser', 'username profilePicture');
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Get all notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Calculate date 24 hours ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Delete old notifications (older than 1 day) as a cleanup measure
    // Note: MongoDB TTL index will also auto-delete, but this ensures immediate cleanup
    await Notification.deleteMany({
      user: userId,
      createdAt: { $lt: oneDayAgo }
    });

    // Get notifications (only those created in the last 24 hours will exist due to TTL)
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('fromUser', 'username profilePicture isVerified')
      .lean();

    res.json({ notifications });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Calculate date 24 hours ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Only count unread notifications from the last 24 hours
    const count = await Notification.countDocuments({
      user: userId,
      read: false,
      createdAt: { $gte: oneDayAgo }
    });
    
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark notifications as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    
    await Notification.updateMany(
      { user: userId, read: false },
      { 
        read: true,
        readAt: new Date()
      }
    );
    
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark single notification as read
exports.markOneAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


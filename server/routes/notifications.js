const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationsController = require('../controllers/notificationsController');

// @route   GET /api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', auth, notificationsController.getNotifications);

// @route   GET /api/notifications/unread/count
// @desc    Get unread notification count
// @access  Private
router.get('/unread/count', auth, notificationsController.getUnreadCount);

// @route   POST /api/notifications/read
// @desc    Mark all notifications as read
// @access  Private
router.post('/read', auth, notificationsController.markAsRead);

// @route   POST /api/notifications/:id/read
// @desc    Mark single notification as read
// @access  Private
router.post('/:id/read', auth, notificationsController.markOneAsRead);

module.exports = router;


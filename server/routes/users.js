const express = require('express');
const auth = require('../middleware/auth');
const usersController = require('../controllers/usersController');

const router = express.Router();

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Users router is working', path: req.path, timestamp: new Date().toISOString() });
});

// @route   GET /api/users/search/skills
// @desc    Search users by skills
// @access  Public
router.get('/search/skills', usersController.searchUsersBySkills);

// @route   GET /api/users
// @desc    Get all users with search and pagination
// @access  Public
router.get('/', usersController.getUsers);

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/:id', usersController.getUserById);

// @route   GET /api/users/:id/posts
// @desc    Get posts by a specific user
// @access  Public
router.get('/:id/posts', usersController.getUserPosts);

// @route   POST /api/users/:id/follow
// @desc    Follow/unfollow a user
// @access  Private
router.post('/:id/follow', auth, usersController.toggleFollow);

// @route   GET /api/users/:id/followers
// @desc    Get user's followers
// @access  Public
router.get('/:id/followers', usersController.getUserFollowers);

// @route   GET /api/users/:id/following
// @desc    Get users that this user is following
// @access  Public
router.get('/:id/following', usersController.getUserFollowing);

// @route   DELETE /api/users/:id
// @desc    Delete user and all their posts (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, usersController.deleteUser);

// @route   POST /api/users/verification/request
// @desc    Send verification request email
// @access  Private
router.post('/verification/request', auth, usersController.requestVerification);

module.exports = router;







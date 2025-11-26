const express = require('express');
const auth = require('../middleware/auth');
const postsController = require('../controllers/postsController');

const router = express.Router();

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', auth, postsController.createPost);

// @route   GET /api/posts
// @desc    Get all posts with pagination
// @access  Public
router.get('/', postsController.getPosts);

// @route   GET /api/posts/popular
// @desc    Get popular posts sorted by likes
// @access  Public
router.get('/popular', postsController.getPopularPosts);

// @route   GET /api/posts/user/:userId
// @desc    Get posts by a specific user
// @access  Public
router.get('/user/:userId', postsController.getUserPosts);

// @route   GET /api/posts/:id
// @desc    Get a specific post
// @access  Public
router.get('/:id', postsController.getPostById);

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private
router.put('/:id', auth, postsController.updatePost);

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', auth, postsController.deletePost);

// @route   POST /api/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.post('/:id/like', auth, postsController.likePost);

// @route   POST /api/posts/:id/comment
// @desc    Add a comment to a post
// @access  Private
router.post('/:id/comment', auth, postsController.addComment);

// @route   POST /api/posts/:id/comment/:commentId/like
// @desc    Like/unlike a comment
// @access  Private
router.post('/:id/comment/:commentId/like', auth, postsController.likeComment);

module.exports = router;


const mongoose = require('mongoose');
const Post = require('../models/Post');

exports.createPost = async (req, res) => {
  try {
    const { content, image, tags, type, code } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    const postData = {
      author: req.user._id,
      content: content.trim(),
      image: image || null,
      tags: tags || [],
      type: type === 'code' ? 'code' : 'text'
    };

    if (postData.type === 'code') {
      const language = code?.language;
      const sourceCode = code?.sourceCode;
      const stdin = code?.stdin || '';
      if (!language || !['cpp', 'java'].includes(language)) {
        return res.status(400).json({ message: 'Invalid or missing code language' });
      }
      if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
        return res.status(400).json({ message: 'Source code is required for code posts' });
      }
      postData.code = {
        language,
        sourceCode,
        stdin
      };
    } else {
      // Ensure code field is not set for text posts to avoid validation issues
      postData.code = undefined;
    }

    const post = new Post(postData);

    await post.save();

    await post.populate('author', 'username profilePicture isVerified');

    try {
      const io = req.app.get('io');
      if (io) io.emit('post:created', post);
    } catch (e) {}

    res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    console.error('Create post error:', error);
    
    // Provide more detailed error messages
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message: `Validation error: ${errors}` });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid data format' });
    }
    
    // Return the actual error message if available, otherwise generic message
    const errorMessage = error.message || 'Server error';
    res.status(500).json({ message: errorMessage });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get current user ID if authenticated
    let currentUserId = null;
    if (req.user) {
      currentUserId = req.user._id;
    } else {
      // Try to get user from token if present but not required
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          currentUserId = decoded.userId;
        } catch (error) {
          // Token invalid or missing - ignore
        }
      }
    }

    // Fetch posts with populate - use query populate before lean for better error handling
    let posts;
    try {
      // Optimize query: limit comments populated to reduce data transfer
      const query = Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'author',
          select: 'username profilePicture isVerified', // Removed followers/following - not needed in posts list
          options: { strictPopulate: false }
        })
        .populate({
          path: 'likes',
          select: 'username profilePicture',
          options: { default: [], strictPopulate: false },
          perDocumentLimit: 20 // Reduced from 50 to 20 - only show first 20 likes
        })
        .populate({
          path: 'comments.user',
          select: 'username profilePicture',
          options: { default: [], strictPopulate: false },
          perDocumentLimit: 10, // Limit to 10 most recent comments per post
          sort: { createdAt: -1 } // Get most recent comments first
        })
        .select('-comments.likes') // Don't populate comment likes initially - load on demand
        .maxTimeMS(15000); // Reduced to 15 seconds
      
      posts = await query.lean();
      
      // Clean up any failed populates - set defaults for missing data
      posts = posts.map(post => {
        // Ensure author exists
        if (!post.author || typeof post.author === 'string') {
          post.author = { username: 'Unknown', profilePicture: null, isVerified: false };
        }
        
        // Ensure likes is an array
        if (!Array.isArray(post.likes)) {
          post.likes = [];
        } else {
          post.likes = post.likes.filter(like => like !== null && like !== undefined);
        }
        
        // Ensure comments is an array with valid users and preserve likes
        if (!Array.isArray(post.comments)) {
          post.comments = [];
        } else {
          post.comments = post.comments.map(comment => ({
            ...comment,
            user: comment.user || { username: 'Unknown', profilePicture: null },
            likes: Array.isArray(comment.likes) ? comment.likes : [] // Preserve comment likes
          }));
        }
        
        return post;
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw dbError; // Re-throw to be caught by outer catch
    }

    // Use estimatedDocumentCount for faster count (approximate but much faster)
    const total = await Post.estimatedDocumentCount().catch(() => Post.countDocuments());

    // Batch check follow status for all authors (more efficient than per-post)
    const followStatusMap = {};
    if (currentUserId && posts.length > 0) {
      const authorIds = [...new Set(posts.map(p => p.author?._id || p.author).filter(Boolean))];
      if (authorIds.length > 0) {
        try {
          const User = require('../models/User');
          const currentUser = await User.findById(currentUserId).select('following').lean();
          if (currentUser && currentUser.following) {
            const followingSet = new Set(
              currentUser.following.map(id => id?.toString() || String(id))
            );
            authorIds.forEach(authorId => {
              const authorIdStr = authorId?.toString() || String(authorId);
              followStatusMap[authorIdStr] = followingSet.has(authorIdStr);
            });
          }
        } catch (e) {
          console.error('Error checking follow status:', e);
        }
      }
    }

    // Filter out posts with null/missing authors and ensure data integrity
    const postsWithCounts = posts
      .filter(post => post && post.author && post._id)
      .map(post => {
        const authorId = post.author?._id?.toString() || post.author?.toString();
        const isFollowing = followStatusMap[authorId] || false;

        // Limit comments to 10 most recent to reduce payload
        const limitedComments = Array.isArray(post.comments) 
          ? post.comments.slice(0, 10).filter(comment => comment && comment.user)
          : [];

        return {
          ...post,
          author: {
            _id: post.author._id,
            username: post.author.username,
            profilePicture: post.author.profilePicture,
            isVerified: post.author?.isVerified === true || post.author?.isVerified === 'true' || false,
            isFollowing: isFollowing
          },
          likes: Array.isArray(post.likes) ? post.likes.slice(0, 20).filter(like => like !== null) : [], // Limit to 20 likes
          comments: limitedComments.map(comment => ({
            _id: comment._id,
            text: comment.text,
            user: comment.user,
            createdAt: comment.createdAt,
            likes: [] // Don't send comment likes in list view - load on demand
          })),
          likeCount: post.likes && Array.isArray(post.likes) ? post.likes.length : 0,
          commentCount: post.comments && Array.isArray(post.comments) ? post.comments.length : 0
        };
      });

    res.json({
      posts: postsWithCounts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get posts error:', error);
    console.error('Error stack:', error.stack);
    
    // Return empty posts array instead of error for better UX
    // But return 200 status so client doesn't treat it as an error
    res.status(200).json({
      posts: [],
      currentPage: 1,
      totalPages: 0,
      totalPosts: 0,
      message: 'Posts temporarily unavailable'
    });
  }
};

exports.getPopularPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const posts = await Post.aggregate([
      { $addFields: { 
        likeCount: { $size: { $ifNull: ['$likes', []] } }, 
        commentCount: { $size: { $ifNull: ['$comments', []] } } 
      }},
      { $sort: { likeCount: -1, createdAt: -1 } },
      { $limit: limit },
      { $lookup: { 
        from: 'users', 
        localField: 'author', 
        foreignField: '_id', 
        as: 'author' 
      }},
      { $match: { author: { $ne: [] } } }, // Filter out posts with no author
      { $unwind: '$author' },
      { $project: { 
        'author.password': 0,
        'author.followers': 0,
        'author.following': 0,
        'author.email': 0,
        'author.emailVerified': 0,
        'author.emailVerificationCode': 0,
        'author.emailVerificationExpires': 0,
        'comments': 0, // Don't include comments in popular posts
        'likes': 0 // Don't include full likes array
      }},
      { $addFields: {
        'author.isVerified': { $ifNull: ['$author.isVerified', false] }
      }}
    ]).maxTimeMS(10000); // 10 second timeout
    
    res.json(posts || []);
  } catch (error) {
    console.error('Get popular posts error:', error);
    // Return empty array instead of error
    res.json([]);
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.json({
        posts: [],
        currentPage: 1,
        totalPages: 0,
        totalPosts: 0
      });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get current user ID if authenticated
    let currentUserId = null;
    if (req.user) {
      currentUserId = req.user._id;
    } else {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          currentUserId = decoded.userId;
        } catch (error) {
          // Token invalid or missing - ignore
        }
      }
    }

    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'author',
        select: 'username profilePicture followers following isVerified',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'likes',
        select: 'username profilePicture',
        options: { default: [], strictPopulate: false }
      })
      .populate({
        path: 'comments.user',
        select: 'username profilePicture',
        options: { default: [], strictPopulate: false }
      })
      .lean();

    const total = await Post.countDocuments({ author: userId });

    // Ensure data integrity and filter out invalid posts
    const postsWithCounts = posts
      .filter(post => post && post._id && post.author)
      .map(post => {
        // Check if current user is following the post author
        let isFollowing = false;
        if (currentUserId && post.author && post.author.followers) {
          isFollowing = post.author.followers.some(follower => {
            const followerId = typeof follower === 'object' ? follower._id?.toString() : follower?.toString();
            return followerId === currentUserId.toString();
          });
        }

        return {
          ...post,
          author: {
            ...post.author,
            isFollowing: isFollowing,
            isVerified: post.author?.isVerified === true || post.author?.isVerified === 'true' || false,
            // Don't expose full follower arrays in posts response
            followers: undefined,
            following: undefined
          },
          likes: Array.isArray(post.likes) ? post.likes.filter(like => like !== null) : [],
          comments: Array.isArray(post.comments) 
            ? post.comments
                .filter(comment => comment && comment.user)
                .map(comment => ({
                  ...comment,
                  likes: Array.isArray(comment.likes) ? comment.likes : [] // Preserve comment likes
                }))
            : [],
          likeCount: post.likes && Array.isArray(post.likes) ? post.likes.length : 0,
          commentCount: post.comments && Array.isArray(post.comments) ? post.comments.length : 0
        };
      });

    res.json({
      posts: postsWithCounts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    // Return empty posts array instead of error
    res.json({
      posts: [],
      currentPage: 1,
      totalPages: 0,
      totalPosts: 0
    });
  }
};

exports.getPostById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const post = await Post.findById(req.params.id)
      .populate('author', 'username profilePicture isVerified')
      .populate({
        path: 'likes',
        select: 'username profilePicture',
        options: { default: [] }
      })
      .populate({
        path: 'comments.user',
        select: 'username profilePicture',
        options: { default: [] }
      });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const { content, image, tags, type, code } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content is required' });
    }
    post.content = content.trim();
    post.image = image || null;
    post.tags = tags || [];
    // Allow switching between text and code
    post.type = type === 'code' ? 'code' : 'text';
    if (post.type === 'code') {
      const language = code?.language;
      const sourceCode = code?.sourceCode;
      const stdin = code?.stdin || '';
      if (!language || !['cpp', 'java'].includes(language)) {
        return res.status(400).json({ message: 'Invalid or missing code language' });
      }
      if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
        return res.status(400).json({ message: 'Source code is required for code posts' });
      }
      post.code = { language, sourceCode, stdin };
    } else {
      post.code = undefined;
    }
    post.isEdited = true;
    post.editedAt = new Date();
    await post.save();
    try {
      const io = req.app.get('io');
      if (io) io.emit('post:updated', post);
    } catch (e) {}
    res.json({ message: 'Post updated successfully', post });
  } catch (error) {
    console.error('Update post error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }
    await post.deleteOne();
    try {
      const io = req.app.get('io');
      if (io) io.emit('post:deleted', { _id: req.params.id });
    } catch (e) {}
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.likePost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    // Initialize likes array if it doesn't exist
    if (!post.likes) post.likes = [];
    
    const likeIndex = post.likes.findIndex(
      likeId => likeId.toString() === req.user._id.toString()
    );
    
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();
    try {
      const io = req.app.get('io');
      if (io) io.emit('post:liked', { _id: post._id, likes: post.likes, likeCount: post.likes.length });
    } catch (e) {}
    res.json({ message: likeIndex > -1 ? 'Post unliked' : 'Post liked', likes: post.likes, likeCount: post.likes.length });
  } catch (error) {
    console.error('Like post error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    // Initialize comments array if it doesn't exist
    if (!post.comments) post.comments = [];
    
    post.comments.push({ 
      user: req.user._id, 
      text: text.trim(), 
      likes: [], // Initialize likes array for new comment
      createdAt: new Date() 
    });
    await post.save();
    await post.populate('comments.user', 'username profilePicture');
    const newComment = post.comments[post.comments.length - 1];
    try {
      const io = req.app.get('io');
      if (io) io.emit('post:commented', { _id: post._id, comment: newComment });
    } catch (e) {}
    res.status(201).json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    console.error('Add comment error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Like/unlike a comment
exports.likeComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Initialize likes array if it doesn't exist
    if (!comment.likes) {
      comment.likes = [];
    }

    // Check if user already liked the comment
    const likeIndex = comment.likes.findIndex(
      id => id.toString() === userId.toString()
    );

    // Toggle like
    if (likeIndex > -1) {
      // Unlike: remove user from likes array
      comment.likes.splice(likeIndex, 1);
    } else {
      // Like: add user to likes array
      comment.likes.push(userId);
    }

    await post.save();

    // Emit socket event for real-time updates
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('comment:liked', { 
          postId: post._id, 
          commentId: comment._id,
          likes: comment.likes,
          likeCount: comment.likes.length 
        });
      }
    } catch (e) {}

    res.json({ 
      message: likeIndex > -1 ? 'Comment unliked' : 'Comment liked', 
      likes: comment.likes,
      likeCount: comment.likes.length 
    });
  } catch (error) {
    console.error('Like comment error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'Post or comment not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};





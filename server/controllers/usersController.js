const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const emailService = require('../services/emailService');

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();
    const skip = (page - 1) * limit;

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: 'Database connection error' });
    }

    let currentUserId = null;
    try {
      const jwt = require('jsonwebtoken');
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.userId;
      }
    } catch (tokenError) {
      currentUserId = null;
    }

    let query = {};
    if (currentUserId) {
      query._id = { $ne: mongoose.Types.ObjectId.isValid(currentUserId) ? new mongoose.Types.ObjectId(currentUserId) : currentUserId };
    }

    if (search && search.length > 0) {
      try {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchQuery = {
          $or: [
            { username: { $regex: escapedSearch, $options: 'i' } },
            { bio: { $regex: escapedSearch, $options: 'i' } }
          ]
        };

        if (currentUserId) {
          query = {
            $and: [
              searchQuery,
              { _id: { $ne: mongoose.Types.ObjectId.isValid(currentUserId) ? new mongoose.Types.ObjectId(currentUserId) : currentUserId } }
            ]
          };
        } else {
          query = searchQuery;
        }
      } catch (regexError) {
        if (!currentUserId) {
          query = {};
        }
      }
    }

    let users;
    if (search && search.length > 0) {
      const maxResultsForSorting = 100;
      const allMatchingUsers = await User.find(query)
        .select('username profilePicture bio skills isVerified')
        .limit(maxResultsForSorting)
        .maxTimeMS(10000)
        .lean();

      const searchLower = search.toLowerCase();
      allMatchingUsers.sort((a, b) => {
        const aUsernameMatch = (a.username?.toLowerCase() || '').includes(searchLower);
        const bUsernameMatch = (b.username?.toLowerCase() || '').includes(searchLower);
        const aBioMatch = (a.bio?.toLowerCase() || '').includes(searchLower);
        const bBioMatch = (b.bio?.toLowerCase() || '').includes(searchLower);

        if (aUsernameMatch && !bUsernameMatch) return -1;
        if (!aUsernameMatch && bUsernameMatch) return 1;
        if (aBioMatch && !bBioMatch) return -1;
        if (!aBioMatch && bBioMatch) return 1;
        return ((a.username || '').toLowerCase()).localeCompare((b.username || '').toLowerCase());
      });

      users = allMatchingUsers.slice(skip, skip + limit);
    } else {
      users = await User.find(query)
        .select('username profilePicture bio skills isVerified')
        .sort({ username: 1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(10000)
        .lean();
    }

    const sanitizedUsers = users.map(user => {
      try {
        const userObj = user.toObject ? user.toObject() : (typeof user === 'object' ? { ...user } : {});
        delete userObj.password;
        if (userObj.isVerified !== undefined) {
          userObj.isVerified = !!userObj.isVerified;
        }
        return userObj;
      } catch (e) {
        return user;
      }
    });

    const total = await User.countDocuments(query);

    res.json({ 
      users: sanitizedUsers, 
      currentPage: page, 
      totalPages: Math.ceil(total / limit), 
      totalUsers: total 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    try {
      if (user.followers && Array.isArray(user.followers) && user.followers.length > 0) {
        await user.populate({ path: 'followers', select: 'username profilePicture isVerified' });
      }
      if (user.following && Array.isArray(user.following) && user.following.length > 0) {
        await user.populate({ path: 'following', select: 'username profilePicture isVerified' });
      }
    } catch (populateError) {
      // continue without populate
    }

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
          // ignore
        }
      }
    }

    if (currentUserId) {
      const isFollowing = user.followers && user.followers.some(follower => {
        const followerId = typeof follower === 'object' ? follower._id.toString() : follower.toString();
        return followerId === currentUserId.toString();
      });

      const isFollowedBy = user.following && user.following.some(following => {
        const followingId = typeof following === 'object' ? following._id.toString() : following.toString();
        return followingId === currentUserId.toString();
      });

      user._doc.isFollowing = !!isFollowing;
      user._doc.isFollowedBy = !!isFollowedBy;
      user._doc.isMutualFollow = !!isFollowing && !!isFollowedBy;
    }

    if (user._doc) {
      user._doc.isVerified = !!user._doc.isVerified;
    } else {
      user.isVerified = !!user.isVerified;
    }

    res.json(user);
  } catch (error) {
    if (error.name === 'CastError' || error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const posts = await Post.find({ author: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profilePicture isVerified')
      .populate({ path: 'likes', select: 'username profilePicture', options: { default: [] } })
      .populate({ path: 'comments.user', select: 'username profilePicture', options: { default: [] } });
    const total = await Post.countDocuments({ author: id });
    res.json({ posts, currentPage: page, totalPages: Math.ceil(total / limit), totalPosts: total });
  } catch (error) {
    if (error.name === 'CastError' || error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleFollow = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    if (!currentUser.following) currentUser.following = [];
    if (!userToFollow.followers) userToFollow.followers = [];
    if (!userToFollow.following) userToFollow.following = [];

    const isFollowing = currentUser.following.some(id => id.toString() === req.params.id);

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user._id.toString());
    } else {
      if (!currentUser.following.includes(req.params.id)) {
        currentUser.following.push(req.params.id);
      }
      if (!userToFollow.followers.some(id => id.toString() === req.user._id.toString())) {
        userToFollow.followers.push(req.user._id);
      }

      try {
        const { createNotification } = require('./notificationsController');
        const Notification = require('../models/Notification');
        const notification = await createNotification(userToFollow._id, 'follow', currentUser._id);

        if (notification) {
          const io = req.app.get('io');
          if (io) {
            const populatedNotification = await Notification.findById(notification._id)
              .populate('fromUser', 'username profilePicture isVerified')
              .lean();

            if (populatedNotification) {
              populatedNotification.user = userToFollow._id;
              io.to(userToFollow._id.toString()).emit('newNotification', { notification: populatedNotification });
            }
          }
        }
      } catch (notificationError) {
        // don't fail the follow operation if notification fails
      }
    }

    await currentUser.save();
    await userToFollow.save();

    const isFollowedBy = userToFollow.following.some(id => id.toString() === req.user._id.toString());
    const isMutualFollow = !isFollowing && isFollowedBy;

    res.json({ 
      message: isFollowing ? 'User unfollowed' : 'User followed', 
      isFollowing: !isFollowing,
      isFollowedBy,
      isMutualFollow 
    });
  } catch (error) {
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserFollowers = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    try {
      if (user.followers && Array.isArray(user.followers) && user.followers.length > 0) {
        await user.populate({ path: 'followers', select: 'username profilePicture bio skills isVerified', options: { skip, limit } });
      }
    } catch (populateError) {
      // continue
    }

    const total = user.followers && Array.isArray(user.followers) ? user.followers.length : 0;
    const followers = user.followers && Array.isArray(user.followers) ? user.followers.slice(skip, skip + limit) : [];

    res.json({ followers: followers, currentPage: page, totalPages: Math.ceil(total / limit), totalFollowers: total });
  } catch (error) {
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserFollowing = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    try {
      if (user.following && Array.isArray(user.following) && user.following.length > 0) {
        await user.populate({ path: 'following', select: 'username profilePicture bio skills isVerified', options: { skip, limit } });
      }
    } catch (populateError) {
      // continue
    }

    const total = user.following && Array.isArray(user.following) ? user.following.length : 0;
    const following = user.following && Array.isArray(user.following) ? user.following.slice(skip, skip + limit) : [];

    res.json({ following: following, currentPage: page, totalPages: Math.ceil(total / limit), totalFollowing: total });
  } catch (error) {
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }
    const deletedPosts = await Post.deleteMany({ author: userId });
    await User.findByIdAndDelete(userId);
    res.json({ message: 'User and all posts deleted successfully', deletedPosts: deletedPosts.deletedCount });
  } catch (error) {
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.searchUsersBySkills = async (req, res) => {
  try {
    const { skills } = req.query;
    if (!skills) {
      return res.status(400).json({ message: 'Skills parameter is required' });
    }
    const skillsArray = skills.split(',').map(skill => skill.trim());
    const users = await User.find({ skills: { $in: skillsArray } }).select('username profilePicture bio skills isVerified').limit(20);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.requestVerification = async (req, res) => {
  try {
  const { body, toEmail } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Request body is required.' });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated.' });
    }

    const user = await User.findById(userId).select('email username');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: 'Email not found for this account.' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!emailService || !smtpHost || !smtpUser || !smtpPass) {
      return res.status(200).json({ success: true, skipped: true, message: 'Verification request received.' });
    }

  const emailResult = await emailService.sendVerificationRequestEmail(user.email, user.username, body.trim(), toEmail && String(toEmail).trim());

    if (emailResult && emailResult.success) {
      return res.status(200).json({ success: true, message: 'Verification request sent successfully.' });
    }

    const errMsg = emailResult && emailResult.error ? String(emailResult.error) : null;
    const errStack = emailResult && emailResult.stack ? String(emailResult.stack) : null;
    if (errMsg || errStack) {
      console.error('Verification email error:', errMsg);
      if (errStack) console.error(errStack);
    }

    return res.status(502).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? `Failed to send verification request: ${errMsg}` : 'Failed to send verification request, please try again later.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
exports.getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const posts = await Post.find({ author: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
    const total = await Post.countDocuments({ author: id });
    res.json({ posts, currentPage: page, totalPages: Math.ceil(total / limit), totalPosts: total });
  } catch (error) {
    console.error('Get user posts error:', error);
    if (error.name === 'CastError' || error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleFollow = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }
    
    // Initialize arrays if they don't exist
    if (!currentUser.following) currentUser.following = [];
    if (!userToFollow.followers) userToFollow.followers = [];
    if (!userToFollow.following) userToFollow.following = [];
    
    const isFollowing = currentUser.following.some(
      id => id.toString() === req.params.id
    );
    
    if (isFollowing) {
      // Unfollow: remove from currentUser.following and userToFollow.followers
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== req.params.id
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      // Follow: add to currentUser.following and userToFollow.followers
      if (!currentUser.following.includes(req.params.id)) {
        currentUser.following.push(req.params.id);
      }
      if (!userToFollow.followers.some(id => id.toString() === req.user._id.toString())) {
        userToFollow.followers.push(req.user._id);
      }
      
      // Create notification for the user being followed
      try {
        const { createNotification } = require('./notificationsController');
        const Notification = require('../models/Notification');
        const notification = await createNotification(
          userToFollow._id,
          'follow',
          currentUser._id
        );
        
        // Emit socket event for real-time notification
        if (notification) {
          const io = req.app.get('io');
          if (io) {
            // Populate notification with fromUser before emitting
            const populatedNotification = await Notification.findById(notification._id)
              .populate('fromUser', 'username profilePicture isVerified')
              .lean();
            
            if (populatedNotification) {
              // Ensure user field is included in notification
              populatedNotification.user = userToFollow._id;
              
              // Emit to the user's room (they joined their userId room on connect)
              io.to(userToFollow._id.toString()).emit('newNotification', {
                notification: populatedNotification
              });
            }
          }
        }
      } catch (notificationError) {
        console.error('Error creating follow notification:', notificationError);
        // Don't fail the follow operation if notification fails
      }
    }
    
    await currentUser.save();
    await userToFollow.save();
    
    // Check if it's a mutual follow
    const isFollowedBy = userToFollow.following.some(
      id => id.toString() === req.user._id.toString()
    );
    const isMutualFollow = !isFollowing && isFollowedBy;
    
    res.json({ 
      message: isFollowing ? 'User unfollowed' : 'User followed', 
      isFollowing: !isFollowing,
      isFollowedBy,
      isMutualFollow 
    });
  } catch (error) {
    console.error('Follow user error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserFollowers = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Safely populate followers
    try {
      if (user.followers && Array.isArray(user.followers) && user.followers.length > 0) {
        await user.populate({
          path: 'followers',
          select: 'username profilePicture bio skills isVerified',
          options: { skip, limit }
        });
      }
    } catch (populateError) {
      console.warn('Populate error in getUserFollowers:', populateError.message);
    }
    
    const total = user.followers && Array.isArray(user.followers) ? user.followers.length : 0;
    const followers = user.followers && Array.isArray(user.followers) ? user.followers.slice(skip, skip + limit) : [];
    
    res.json({ 
      followers: followers, 
      currentPage: page, 
      totalPages: Math.ceil(total / limit), 
      totalFollowers: total 
    });
  } catch (error) {
    console.error('Get followers error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserFollowing = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Safely populate following
    try {
      if (user.following && Array.isArray(user.following) && user.following.length > 0) {
        await user.populate({
          path: 'following',
          select: 'username profilePicture bio skills isVerified',
          options: { skip, limit }
        });
      }
    } catch (populateError) {
      console.warn('Populate error in getUserFollowing:', populateError.message);
    }
    
    const total = user.following && Array.isArray(user.following) ? user.following.length : 0;
    const following = user.following && Array.isArray(user.following) ? user.following.slice(skip, skip + limit) : [];
    
    res.json({ 
      following: following, 
      currentPage: page, 
      totalPages: Math.ceil(total / limit), 
      totalFollowing: total 
    });
  } catch (error) {
    console.error('Get following error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }
    const deletedPosts = await Post.deleteMany({ author: userId });
    console.log(`Deleted ${deletedPosts.deletedCount} posts for user ${userId}`);
    await User.findByIdAndDelete(userId);
    res.json({ message: 'User and all posts deleted successfully', deletedPosts: deletedPosts.deletedCount });
  } catch (error) {
    console.error('Delete user error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.searchUsersBySkills = async (req, res) => {
  try {
    const { skills } = req.query;
    if (!skills) {
      return res.status(400).json({ message: 'Skills parameter is required' });
    }
    const skillsArray = skills.split(',').map(skill => skill.trim());
    const users = await User.find({ skills: { $in: skillsArray } })
      .select('username profilePicture bio skills isVerified')
      .limit(20);
    res.json(users);
  } catch (error) {
    console.error('Search users by skills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};







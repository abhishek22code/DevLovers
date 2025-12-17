const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

exports.signup = async (req, res) => {
  try {
    console.log('Signup request received:', req.body);
    let { username, email, password, bio, gender } = req.body;

    // Basic input validation
    const validationErrors = {};
    if (!username || String(username).trim().length === 0) {
      validationErrors.username = 'Username is required';
    } else {
      username = String(username).trim();
      if (username.length < 3) validationErrors.username = 'Username must be at least 3 characters';
      if (username.length > 20) validationErrors.username = 'Username cannot exceed 20 characters';
    }
    if (!email || String(email).trim().length === 0) {
      validationErrors.email = 'Email is required';
    } else {
      email = String(email).toLowerCase().trim();
    }
    if (!password || String(password).length === 0) {
      validationErrors.password = 'Password is required';
    } else if (String(password).length < 6) {
      validationErrors.password = 'Password must be at least 6 characters';
    }
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    const user = new User({
      username,
      email,
      password,
      bio: bio || '',
      gender: gender || 'prefer-not-to-say',
      emailVerified: true,
      isVerified: true
    });

    console.log('Saving user...');
    await user.save();
    console.log('User saved successfully');

    res.status(201).json({
      message: 'Account created successfully. You may sign in with your credentials.',
      requiresVerification: false
    });
  } catch (error) {
    console.error('Signup error details:', error);
    console.error('Error stack:', error.stack);
    // Handle duplicate key errors (race conditions against pre-check)
    if (error && error.code === 11000) {
      const dupField = Object.keys(error.keyPattern || {})[0] || 'field';
      const message = dupField === 'email' ? 'Email already registered' : (dupField === 'username' ? 'Username already taken' : 'Duplicate value');
      return res.status(400).json({ message });
    }
    // Handle Mongoose validation errors
    if (error && error.name === 'ValidationError') {
      const errors = {};
      for (const [key, val] of Object.entries(error.errors || {})) {
        errors[key] = val.message;
      }
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    res.status(500).json({ message: 'Server error during signup' });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('🔐 Login request received');
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log('❌ Login failed: Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email (case-insensitive)
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 Looking for user with email:', normalizedEmail);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log('❌ Login failed: User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    console.log('✅ User found:', user.username);
    
    // Check email verification - but allow login for testing/development
    // In production, uncomment this to require email verification
    // if (!user.emailVerified) {
    //   return res.status(403).json({ message: 'Please verify your email' });
    // }
    
    // Compare password
    console.log('🔐 Comparing password...');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Login failed: Invalid password');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    console.log('✅ Password matched');
    
    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    console.log('✅ User status updated');
    
    // Generate token
    const token = generateToken(user._id);
    console.log('✅ Token generated');
    
    // Get fresh user data with virtual fields
    const freshUser = await User.findById(user._id).select('-password');
    if (!freshUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Safely populate followers and following
    try {
      if (freshUser.followers && Array.isArray(freshUser.followers) && freshUser.followers.length > 0) {
        await freshUser.populate({
          path: 'followers',
          select: 'username profilePicture',
          options: { strictPopulate: false }
        });
      }
      if (freshUser.following && Array.isArray(freshUser.following) && freshUser.following.length > 0) {
        await freshUser.populate({
          path: 'following',
          select: 'username profilePicture',
          options: { strictPopulate: false }
        });
      }
    } catch (populateError) {
      console.warn('Populate error in login:', populateError.message);
      // Continue without populate if it fails
    }
    
    // Calculate counts from arrays (handle both populated and non-populated cases)
    const followerCount = freshUser.followers && Array.isArray(freshUser.followers) 
      ? freshUser.followers.length 
      : 0;
    const followingCount = freshUser.following && Array.isArray(freshUser.following) 
      ? freshUser.following.length 
      : 0;
    
    // Build response
    // Extract following array as IDs (handle both populated and non-populated)
    const followingArray = freshUser.following && Array.isArray(freshUser.following)
      ? freshUser.following.map(f => typeof f === 'object' ? (f._id || f.id || f) : f)
      : [];
    
    const userResponse = {
      _id: freshUser._id,
      id: freshUser._id, // Also include id for backward compatibility
      username: freshUser.username,
      email: freshUser.email,
      profilePicture: freshUser.profilePicture || null,
      bio: freshUser.bio || '',
      skills: Array.isArray(freshUser.skills) ? freshUser.skills : [],
      followerCount: followerCount,
      followingCount: followingCount,
      following: followingArray, // Include following array for FollowContext initialization
      gender: freshUser.gender || 'prefer-not-to-say',
      isVerified: !!freshUser.isVerified
    };
    
    console.log('✅ Login successful for user:', userResponse.username);
    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Login error name:', error.name);
    console.error('❌ Login error message:', error.message);
    console.error('❌ Login error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: error.message });
    }
    
    if (error.name === 'MongoServerError' || error.name === 'MongoError') {
      console.error('❌ MongoDB error during login:', error);
      return res.status(500).json({ message: 'Database error. Please try again.' });
    }
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Server error during login: ${error.message}`
      : 'Server error during login. Please try again.';
    
    res.status(500).json({ message: errorMessage });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Safely populate followers and following
    try {
      if (user.followers && Array.isArray(user.followers) && user.followers.length > 0) {
        await user.populate({
          path: 'followers',
          select: 'username profilePicture'
        });
      }
      if (user.following && Array.isArray(user.following) && user.following.length > 0) {
        await user.populate({
          path: 'following',
          select: 'username profilePicture'
        });
      }
    } catch (populateError) {
      console.warn('Populate error in me:', populateError.message);
      // Continue without populate if it fails
    }
    
    // Ensure isVerified is always a boolean
    if (user._doc) {
      user._doc.isVerified = !!user._doc.isVerified;
    } else {
      user.isVerified = !!user.isVerified;
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, bio, skills, profilePicture, gender } = req.body;
    const updateFields = {};
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      updateFields.username = username;
    }
    if (bio !== undefined) updateFields.bio = bio;
    if (skills !== undefined) updateFields.skills = skills;
    if (profilePicture !== undefined) updateFields.profilePicture = profilePicture;
    if (gender !== undefined) updateFields.gender = gender;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const Post = require('../models/Post');
    await Post.deleteMany({ author: userId });
    await User.findByIdAndDelete(userId);
    res.json({ message: 'Account and all posts deleted successfully' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: new Date() });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  profilePicture: {
    type: String,
    default: function() {
      // Default profile picture based on gender
      const gender = this.gender;
      if (gender === 'male') {
        return 'https://via.placeholder.com/150/3b82f6/ffffff?text=👨';
      } else if (gender === 'female') {
        return 'https://via.placeholder.com/150/ec4899/ffffff?text=👩';
      } else {
        return 'https://via.placeholder.com/150/6366f1/ffffff?text=👤';
      }
    }
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  skills: [{
    type: String,
    trim: true
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  
  followers: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    default: []
  },
  following: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    default: []
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for follower/following counts
userSchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

userSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

// Method to get default profile picture
userSchema.methods.getDefaultProfilePicture = function() {
  const gender = this.gender;
  if (gender === 'male') {
    return 'https://via.placeholder.com/150/3b82f6/ffffff?text=👨';
  } else if (gender === 'female') {
    return 'https://via.placeholder.com/150/ec4899/ffffff?text=👩';
  } else {
    return 'https://via.placeholder.com/150/6366f1/ffffff?text=👤';
  }
};

// Middleware to delete all posts when a user is deleted
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const Post = require('./Post');
    await Post.deleteMany({ author: this._id });
    console.log(`Deleted all posts for user ${this._id}`);
    next();
  } catch (error) {
    console.error('Error deleting user posts:', error);
    next(error);
  }
});

// Middleware for findByIdAndDelete and other delete operations
userSchema.pre('deleteMany', async function(next) {
  try {
    const Post = require('./Post');
    const usersToDelete = await this.model.find(this.getQuery());
    for (const user of usersToDelete) {
      await Post.deleteMany({ author: user._id });
      console.log(`Deleted all posts for user ${user._id}`);
    }
    next();
  } catch (error) {
    console.error('Error deleting user posts:', error);
    next(error);
  }
});

// Add indexes for better query performance
userSchema.index({ username: 1 }); // Index for username searches
userSchema.index({ email: 1 }); // Index for email lookups
userSchema.index({ followers: 1 }); // Index for follower queries
userSchema.index({ following: 1 }); // Index for following queries
userSchema.index({ isVerified: 1 }); // Index for verified user queries

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);


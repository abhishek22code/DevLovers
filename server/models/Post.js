const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Post type: text (default) or code
  type: {
    type: String,
    enum: ['text', 'code'],
    default: 'text',
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  // Optional base64 image data URL
  image: {
    type: String,
    maxlength: 10000000, // up to ~10MB as characters
    required: false,
    default: null
  },
  // Code-specific fields (present when type === 'code')
  code: {
    language: {
      type: String,
      enum: ['cpp', 'java'],
      required: function() { return this.type === 'code'; }
    },
    sourceCode: {
      type: String,
      maxlength: 200000, // 200 KB max source size
      required: function() { return this.type === 'code'; }
    },
    stdin: {
      type: String,
      maxlength: 50000, // optional input up to 50 KB
      required: false
    }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add indexes for better performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ 'comments.createdAt': -1 }); // Index for sorting comments
postSchema.index({ likes: 1 }); // Index for likes queries
 

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Ensure virtual fields are serialized
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);






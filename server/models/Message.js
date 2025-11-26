const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true // Index for faster queries
  },
  receiver: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true // Index for faster queries
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  // Add a flag to mark if message should be archived (for future use)
  archived: {
    type: Boolean,
    default: false
  },
  // Add a flag to mark if message is deleted (soft delete)
  // CRITICAL: Messages should NEVER be deleted or filtered by this field
  // This field exists for potential future features but should NOT be used in queries
  // All message queries must return ALL messages regardless of deleted status
  // Default is false and must always be set to false when creating messages
  deleted: {
    type: Boolean,
    default: false,
    required: false // Allow undefined, but default to false
  }
}, {
  timestamps: true,
  // Ensure messages are never automatically deleted
  collection: 'messages'
});

// Index for efficient querying of conversations
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });
messageSchema.index({ createdAt: -1 }); // Index for sorting by date
messageSchema.index({ sender: 1, createdAt: -1 }); // Compound index for sender queries
messageSchema.index({ receiver: 1, createdAt: -1 }); // Compound index for receiver queries

// Method to get conversation participants (sorted for consistent conversation ID)
messageSchema.statics.getConversationId = function(userId1, userId2) {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

module.exports = mongoose.model('Message', messageSchema);







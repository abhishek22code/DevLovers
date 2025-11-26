/**
 * MESSAGES CONTROLLER - PERMANENT MESSAGE HISTORY
 * 
 * CRITICAL RULES FOR PERMANENT MESSAGE HISTORY:
 * 1. NEVER filter messages by deleted status - ALL messages must be returned
 * 2. NEVER add { deleted: true } or { deleted: false } to query filters
 * 3. Always save new messages with deleted: false explicitly
 * 4. Use comprehensive query strategies to find messages regardless of ID format (string/ObjectId)
 * 5. Messages are stored permanently - there is no soft delete or hard delete functionality
 * 
 * This ensures users can always access their complete message history, including old messages.
 */
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// Check if two users follow each other (mutual follow)
const checkMutualFollow = async (userId1, userId2) => {
  try {
    const user1 = await User.findById(userId1).select('following followers');
    const user2 = await User.findById(userId2).select('following followers');
    
    if (!user1 || !user2) {
      console.log(`checkMutualFollow: User not found - user1: ${!!user1}, user2: ${!!user2}`);
      return false;
    }
    
    // Normalize IDs for comparison
    const normalizeIds = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(id => {
        if (typeof id === 'string') return id;
        if (id && id.toString) return id.toString();
        return String(id);
      }).filter(Boolean);
    };
    
    const user1Following = normalizeIds(user1.following || []);
    const user2Following = normalizeIds(user2.following || []);
    const user1Followers = normalizeIds(user1.followers || []);
    const user2Followers = normalizeIds(user2.followers || []);
    
    // User1 follows User2: user1.following contains user2._id
    const user1FollowsUser2 = user1Following.some(
      id => id.toString() === userId2.toString()
    );
    
    // User2 follows User1: user2.following contains user1._id
    const user2FollowsUser1 = user2Following.some(
      id => id.toString() === userId1.toString()
    );
    
    // Also check followers arrays as backup
    const user1InUser2Followers = user2Followers.some(
      id => id.toString() === userId1.toString()
    );
    const user2InUser1Followers = user1Followers.some(
      id => id.toString() === userId2.toString()
    );
    
    const isMutual = (user1FollowsUser2 && user2FollowsUser1) || 
                     (user1InUser2Followers && user2InUser1Followers);
    
    console.log(`checkMutualFollow(${userId1}, ${userId2}): user1FollowsUser2=${user1FollowsUser2}, user2FollowsUser1=${user2FollowsUser1}, isMutual=${isMutual}`);
    
    return isMutual;
  } catch (error) {
    console.error('Error checking mutual follow:', error);
    return false;
  }
};

// Get all conversations for the current user
exports.getConversations = async (req, res) => {
  try {
    console.log('📨 getConversations endpoint HIT');
    console.log('📨 Request method:', req.method);
    console.log('📨 Request path:', req.path);
    console.log('📨 Request user:', req.user ? req.user._id : 'No user');
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const currentUserId = req.user._id.toString();
    
    // Get current user with both following and followers
    const currentUser = await User.findById(currentUserId).select('following followers');
    if (!currentUser) {
      console.log(`User ${currentUserId} not found`);
      return res.json({ conversations: [] });
    }
    
    // Normalize arrays - handle both ObjectIds and strings
    const normalizeIds = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(id => {
        if (typeof id === 'string') return id;
        if (id && id.toString) return id.toString();
        return String(id);
      }).filter(Boolean);
    };
    
    const followingIds = normalizeIds(currentUser.following || []);
    const followersIds = normalizeIds(currentUser.followers || []);
    
    // Find mutual follows: users who are in BOTH following AND followers arrays
    // User A follows User B AND User B follows User A
    const mutualFollowIds = followingIds.filter(id => {
      const normalizedId = id.toString();
      return followersIds.some(fId => fId.toString() === normalizedId);
    });
    
    console.log(`\n=== Conversations Debug for User ${currentUserId} ===`);
    console.log(`Following count: ${followingIds.length}`);
    console.log(`Followers count: ${followersIds.length}`);
    console.log(`Mutual follows count: ${mutualFollowIds.length}`);
    
    // Get usernames for better debugging
    if (followingIds.length > 0) {
      const followingUsers = await User.find({ _id: { $in: followingIds.map(id => {
        return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
      }).filter(Boolean) } }).select('username').lean();
      console.log(`Following users:`, followingUsers.map(u => u.username).join(', '));
    }
    
    if (followersIds.length > 0) {
      const followersUsers = await User.find({ _id: { $in: followersIds.map(id => {
        return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
      }).filter(Boolean) } }).select('username').lean();
      console.log(`Followers:`, followersUsers.map(u => u.username).join(', '));
    }
    
    if (mutualFollowIds.length > 0) {
      const mutualUsers = await User.find({ _id: { $in: mutualFollowIds.map(id => {
        return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
      }).filter(Boolean) } }).select('username').lean();
      console.log(`Mutual follows:`, mutualUsers.map(u => u.username).join(', '));
    } else {
      console.log(`⚠️  No mutual follows found! You need to follow someone who also follows you back.`);
    }
    console.log(`==========================================\n`);
    
    // Get ALL messages where user is sender or receiver (no limit, no deletion)
    // Only exclude soft-deleted messages
    // Handle both ObjectId and string IDs in the query
    let messages = [];
    try {
      // Normalize currentUserId to string
      const normalizedCurrentUserId = String(currentUserId);
      
      console.log(`🔍 Querying conversations for user: ${normalizedCurrentUserId}`);
      
      // Try all possible query formats and combine results
      const allPossibleQueries = [];
      
      // String query - NO deleted filter (PERMANENT MESSAGE HISTORY)
      allPossibleQueries.push({
        $or: [
          { sender: normalizedCurrentUserId },
          { receiver: normalizedCurrentUserId }
        ]
        // NOTE: Intentionally NOT filtering by deleted field - preserve ALL messages permanently
      });
      
      // ObjectId query if valid
      if (mongoose.Types.ObjectId.isValid(normalizedCurrentUserId)) {
        allPossibleQueries.push({
          $or: [
            { sender: new mongoose.Types.ObjectId(normalizedCurrentUserId) },
            { receiver: new mongoose.Types.ObjectId(normalizedCurrentUserId) }
          ]
        });
      }
      
      // COMPREHENSIVE SEARCH: Try all queries and combine results for ALL messages
      // CRITICAL: No deleted filter - get ALL messages for permanent history
      const allFoundMessages = new Map();
      for (let i = 0; i < allPossibleQueries.length; i++) {
        try {
          const query = allPossibleQueries[i];
          // IMPORTANT: No deleted filter - we want ALL messages permanently
          const found = await Message.find(query).sort({ createdAt: -1 }).lean();
          console.log(`📨 Query strategy ${i + 1}: Found ${found.length} messages`);
          found.forEach(msg => {
            const msgId = String(msg._id);
            if (!allFoundMessages.has(msgId)) {
              allFoundMessages.set(msgId, msg);
            }
          });
        } catch (queryError) {
          console.error(`❌ Query strategy ${i + 1} error:`, queryError);
        }
      }
      
      // Additional fallback: Try a completely open query to find ANY messages
      // This ensures we don't miss messages due to ID format issues
      try {
        const fallbackQuery = await Message.find({
          $or: [
            { sender: { $exists: true } },
            { receiver: { $exists: true } }
          ]
        }).sort({ createdAt: -1 }).limit(200).maxTimeMS(10000).lean(); // Reduced from 500 to 200, added timeout
        
        console.log(`📨 Fallback query: Found ${fallbackQuery.length} total messages in database`);
        
        // Filter to messages involving current user (by converting everything to strings)
        const userRelatedMessages = fallbackQuery.filter(msg => {
          const senderStr = String(msg.sender || msg.sender?._id || '');
          const receiverStr = String(msg.receiver || msg.receiver?._id || '');
          const currentIdStr = String(normalizedCurrentUserId);
          
          // Also try ObjectId comparison if applicable
          const matchesSender = senderStr === currentIdStr || 
                               (mongoose.Types.ObjectId.isValid(currentIdStr) && 
                                mongoose.Types.ObjectId.isValid(senderStr) && 
                                senderStr === currentIdStr);
          const matchesReceiver = receiverStr === currentIdStr || 
                                 (mongoose.Types.ObjectId.isValid(currentIdStr) && 
                                  mongoose.Types.ObjectId.isValid(receiverStr) && 
                                  receiverStr === currentIdStr);
          
          return matchesSender || matchesReceiver;
        });
        
        console.log(`📨 Fallback query: ${userRelatedMessages.length} messages related to current user`);
        
        // Add to found messages map
        userRelatedMessages.forEach(msg => {
          const msgId = String(msg._id);
          allFoundMessages.set(msgId, msg);
        });
      } catch (fallbackError) {
        console.error('❌ Fallback query error:', fallbackError);
      }
      
      messages = Array.from(allFoundMessages.values());
      console.log(`📨 TOTAL FOUND: ${messages.length} messages from all query strategies`);
      
      // PERMANENT MESSAGES: Keep ALL messages - no filtering by deleted status
      // This ensures complete message history is preserved forever
      console.log(`✅ PRESERVING ALL ${messages.length} messages for permanent history`);
      
      // Manually populate sender and receiver
      const senderIds = new Set();
      const receiverIds = new Set();
      
      messages.forEach(msg => {
        const senderId = String(msg.sender?._id || msg.sender);
        const receiverId = String(msg.receiver?._id || msg.receiver);
        
        // Only add valid ObjectIds
        if (mongoose.Types.ObjectId.isValid(senderId)) {
          senderIds.add(senderId);
        }
        if (mongoose.Types.ObjectId.isValid(receiverId)) {
          receiverIds.add(receiverId);
        }
      });
      
      // Fetch all users at once
      const allUserIds = [...senderIds, ...receiverIds];
      const usersMap = new Map();
      
      if (allUserIds.length > 0) {
        const users = await User.find({ 
          _id: { $in: allUserIds.map(id => new mongoose.Types.ObjectId(id)) } 
        })
          .select('username profilePicture isVerified')
          .lean();
        
        users.forEach(user => {
          usersMap.set(String(user._id), user);
        });
      }
      
      // Manually populate sender and receiver in messages
      messages = messages.map(msg => {
        const senderId = String(msg.sender?._id || msg.sender);
        const receiverId = String(msg.receiver?._id || msg.receiver);
        
        return {
          ...msg,
          sender: usersMap.get(senderId) || { _id: msg.sender, username: 'Unknown', profilePicture: null, isVerified: false },
          receiver: usersMap.get(receiverId) || { _id: msg.receiver, username: 'Unknown', profilePicture: null, isVerified: false }
        };
      });
    } catch (messageError) {
      console.error('❌ Error fetching messages:', messageError);
      console.error('❌ Error stack:', messageError.stack);
      messages = []; // Set to empty array on error
    }
    
    // Group messages by conversation partner
    const conversationsMap = new Map();
    
    // Normalize currentUserId for comparison
    const normalizedCurrentUserId = String(currentUserId);
    
    messages.forEach(msg => {
      // Handle both populated objects and raw IDs
      const senderId = msg.sender?._id ? String(msg.sender._id) : String(msg.sender);
      const receiverId = msg.receiver?._id ? String(msg.receiver._id) : String(msg.receiver);
      
      // Normalize IDs for comparison
      const normalizedSenderId = String(senderId);
      const normalizedReceiverId = String(receiverId);
      
      const partnerId = normalizedSenderId === normalizedCurrentUserId
        ? normalizedReceiverId
        : normalizedSenderId;
      
      const partner = normalizedSenderId === normalizedCurrentUserId
        ? msg.receiver
        : msg.sender;
      
      if (!conversationsMap.has(partnerId)) {
        // Ensure createdAt is properly formatted
        let lastMessageTime = msg.createdAt;
        if (lastMessageTime instanceof Date) {
          lastMessageTime = lastMessageTime.toISOString();
        } else if (lastMessageTime && typeof lastMessageTime === 'object' && lastMessageTime.$date) {
          lastMessageTime = new Date(lastMessageTime.$date).toISOString();
        } else if (typeof lastMessageTime === 'string') {
          // Validate string date
          const date = new Date(lastMessageTime);
          if (!isNaN(date.getTime())) {
            lastMessageTime = date.toISOString();
          }
        }
        
        conversationsMap.set(partnerId, {
          user: {
            _id: partner._id || partner,
            username: partner.username || 'Unknown',
            profilePicture: partner.profilePicture || null
          },
          lastMessage: msg.content,
          lastMessageTime: lastMessageTime,
          unread: 0,
          lastMessageSenderId: senderId
        });
      }
      
      const conv = conversationsMap.get(partnerId);
      
      // Update if this is a more recent message
      let msgTime = msg.createdAt;
      if (msgTime instanceof Date) {
        msgTime = msgTime.toISOString();
      } else if (msgTime && typeof msgTime === 'object' && msgTime.$date) {
        msgTime = new Date(msgTime.$date).toISOString();
      }
      
      const msgTimeValue = new Date(msgTime).getTime();
      const convTimeValue = new Date(conv.lastMessageTime).getTime();
      
      if (msgTimeValue > convTimeValue) {
        conv.lastMessage = msg.content;
        conv.lastMessageTime = msgTime;
        conv.lastMessageSenderId = senderId;
      }
      
      // Count unread messages (only messages received, not sent)
      if (
        normalizedReceiverId === normalizedCurrentUserId &&
        !msg.read
      ) {
        conv.unread++;
      }
    });
    
    // Add mutual follows who don't have conversations yet
    if (mutualFollowIds.length > 0) {
      // Convert to ObjectIds for MongoDB query
      const mutualFollowObjectIds = mutualFollowIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      
      if (mutualFollowObjectIds.length > 0) {
        const mutualUsers = await User.find({
          _id: { $in: mutualFollowObjectIds }
        })
          .select('username profilePicture isVerified')
          .lean();
        
        console.log(`Found ${mutualUsers.length} mutual follow users to add`);
        
        mutualUsers.forEach(mutualUser => {
          const partnerId = mutualUser._id.toString();
          
          // Only add if conversation doesn't exist yet
          if (!conversationsMap.has(partnerId)) {
            conversationsMap.set(partnerId, {
              user: {
                _id: mutualUser._id,
                username: mutualUser.username,
                profilePicture: mutualUser.profilePicture
              },
              lastMessage: '',
              lastMessageTime: new Date(0), // Oldest date so new conversations appear last
              unread: 0,
              lastMessageSenderId: null
            });
            console.log(`Added conversation for mutual follow: ${mutualUser.username}`);
          }
        });
      }
    } else {
      console.log('No mutual follows found - user needs to follow someone who also follows them back');
    }
    
    // Filter to only include mutual follows (security check)
    const filteredConversations = [];
    for (const conv of conversationsMap.values()) {
      const partnerId = conv.user._id.toString();
      // Check if this partner is in mutual follows list
      const isMutual = mutualFollowIds.some(id => id.toString() === partnerId);
      if (isMutual) {
        filteredConversations.push(conv);
      } else {
        console.log(`Filtered out conversation with ${conv.user.username} - not a mutual follow`);
      }
    }
    
    // Convert map to array and sort by last message time (most recent first)
    // Conversations with no messages will appear at the end
    const conversations = filteredConversations.map(conv => {
      // Ensure lastMessageTime is a proper ISO string for consistent parsing
      if (conv.lastMessageTime && conv.lastMessageTime instanceof Date) {
        conv.lastMessageTime = conv.lastMessageTime.toISOString();
      } else if (conv.lastMessageTime && typeof conv.lastMessageTime === 'object' && conv.lastMessageTime.$date) {
        // Handle MongoDB extended JSON format
        conv.lastMessageTime = new Date(conv.lastMessageTime.$date).toISOString();
      } else if (conv.lastMessageTime && typeof conv.lastMessageTime === 'string') {
        // Validate string date and normalize to ISO
        const date = new Date(conv.lastMessageTime);
        if (!isNaN(date.getTime())) {
          conv.lastMessageTime = date.toISOString();
        }
      }
      return conv;
    }).sort((a, b) => {
      // If one has actual messages and one doesn't, prioritize the one with messages
      const aHasMessages = a.lastMessageSenderId !== null;
      const bHasMessages = b.lastMessageSenderId !== null;
      
      if (aHasMessages && !bHasMessages) return -1;
      if (!aHasMessages && bHasMessages) return 1;
      
      // Both have messages or both don't - sort by time
      const aTime = new Date(a.lastMessageTime).getTime();
      const bTime = new Date(b.lastMessageTime).getTime();
      return bTime - aTime;
    });
    
    console.log(`Returning ${conversations.length} conversations`);
    
    res.json({ conversations: conversations });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Return empty conversations array instead of error to prevent UI breakage
    res.status(200).json({ 
      conversations: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get messages between current user and another user
exports.getMessages = async (req, res) => {
  // VERIFICATION: This log confirms we're running the latest code without isAI
  console.log('✅ getMessages function loaded - NO isAI references (v2.0)');
  try {
    const currentUserId = req.user._id.toString();
    const otherUserId = req.params.userId;
    
    console.log('📨 getMessages request:', { currentUserId, otherUserId });
    
    if (!otherUserId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check mutual follow
      try {
        const isMutual = await checkMutualFollow(currentUserId, otherUserId);
        if (!isMutual) {
          return res.status(403).json({ 
            message: 'You can only message users who follow you back' 
          });
        }
      } catch (mutualFollowError) {
        console.error('❌ Error checking mutual follow:', mutualFollowError);
        // Don't block the request if mutual follow check fails - allow access
        // This prevents 500 errors from blocking legitimate conversations
    }
    
    // Get ALL messages between the two users (no limit, no deletion)
    // Only exclude soft-deleted messages
    // MongoDB should handle type coercion for Mixed types automatically
    let messages = [];
    try {
      // Normalize IDs to strings
      const normalizedCurrentUserId = String(currentUserId);
      const normalizedOtherUserId = String(otherUserId);
      
      console.log(`🔍 Querying messages between: ${normalizedCurrentUserId} and ${normalizedOtherUserId}`);
      
      // Get ALL messages between these users (PERMANENT HISTORY - no deletion filter)
      // CRITICAL: Do not filter by deleted field - return ALL messages for permanent history
      let allMessages = [];
      
      // COMPREHENSIVE QUERY: Try multiple strategies to find ALL messages (PERMANENT HISTORY)
      // Strategy 1: Query with string IDs (what we save)
      const query1 = {
        $or: [
          { sender: normalizedCurrentUserId, receiver: normalizedOtherUserId },
          { sender: normalizedOtherUserId, receiver: normalizedCurrentUserId }
        ]
        // NOTE: Intentionally NOT filtering by deleted - we want ALL messages permanently
      };
      
      // Strategy 2 & 3: Try ObjectId queries if IDs are valid ObjectIds
      const allQueries = [query1];
      
      // Only add ObjectId queries if both IDs are valid ObjectIds
      const currentUserIdValid = mongoose.Types.ObjectId.isValid(normalizedCurrentUserId);
      const otherUserIdValid = mongoose.Types.ObjectId.isValid(normalizedOtherUserId);
      
      if (currentUserIdValid && otherUserIdValid) {
        try {
          // Strategy 2: Query with ObjectId IDs
          allQueries.push({
          $or: [
            { sender: new mongoose.Types.ObjectId(normalizedCurrentUserId), receiver: new mongoose.Types.ObjectId(normalizedOtherUserId) },
            { sender: new mongoose.Types.ObjectId(normalizedOtherUserId), receiver: new mongoose.Types.ObjectId(normalizedCurrentUserId) }
          ]
          });
          
          // Strategy 3: Mixed query - try all combinations
          allQueries.push({
            $or: [
              { sender: normalizedCurrentUserId, receiver: new mongoose.Types.ObjectId(normalizedOtherUserId) },
              { sender: new mongoose.Types.ObjectId(normalizedOtherUserId), receiver: normalizedCurrentUserId },
              { sender: new mongoose.Types.ObjectId(normalizedCurrentUserId), receiver: normalizedOtherUserId },
              { sender: normalizedOtherUserId, receiver: new mongoose.Types.ObjectId(normalizedCurrentUserId) }
            ]
          });
        } catch (objIdError) {
          console.error('⚠️  Error creating ObjectId queries:', objIdError);
          // Continue with just query1
        }
      }
      
      // COMPREHENSIVE QUERY: Try all strategies and also do a complete scan as fallback
      const messageMap = new Map();
      
      // First, try all structured queries
      for (let i = 0; i < allQueries.length; i++) {
        try {
          const found = await Message.find(allQueries[i]).sort({ createdAt: 1 }).lean();
          console.log(`📨 Query ${i + 1}: Found ${found.length} messages`);
          found.forEach(msg => {
            const msgId = String(msg._id);
            if (!messageMap.has(msgId)) {
              messageMap.set(msgId, msg);
            }
          });
        } catch (queryError) {
          console.error(`❌ Query ${i + 1} error:`, queryError);
        }
      }
      
      // CRITICAL FALLBACK: Get ALL messages and filter in-memory to ensure nothing is missed
      // This ensures we find messages regardless of ID format mismatches
      try {
        console.log('📨 Running comprehensive fallback query to find ALL messages...');
        const allMessagesInDB = await Message.find({}).sort({ createdAt: 1 }).lean();
        console.log(`📨 Total messages in database: ${allMessagesInDB.length}`);
        
        // Filter to messages between these two users (convert everything to strings for comparison)
        // Use comprehensive matching to handle all ID format variations
        const conversationMessages = allMessagesInDB.filter(msg => {
          // Normalize all IDs to strings for comparison
          const senderStr = String(msg.sender || msg.sender?._id || '').trim();
          const receiverStr = String(msg.receiver || msg.receiver?._id || '').trim();
          const currentStr = String(normalizedCurrentUserId).trim();
          const otherStr = String(normalizedOtherUserId).trim();
          
          // Try exact string matches first
          const exactMatch = (senderStr === currentStr && receiverStr === otherStr) ||
                            (senderStr === otherStr && receiverStr === currentStr);
          
          // If no exact match, try ObjectId comparisons if applicable
          if (!exactMatch && mongoose.Types.ObjectId.isValid(currentStr) && mongoose.Types.ObjectId.isValid(otherStr)) {
            try {
              const senderObjId = mongoose.Types.ObjectId.isValid(senderStr) ? new mongoose.Types.ObjectId(senderStr) : null;
              const receiverObjId = mongoose.Types.ObjectId.isValid(receiverStr) ? new mongoose.Types.ObjectId(receiverStr) : null;
              const currentObjId = new mongoose.Types.ObjectId(currentStr);
              const otherObjId = new mongoose.Types.ObjectId(otherStr);
              
              if (senderObjId && receiverObjId) {
                const objIdMatch = (senderObjId.equals(currentObjId) && receiverObjId.equals(otherObjId)) ||
                                  (senderObjId.equals(otherObjId) && receiverObjId.equals(currentObjId));
                return objIdMatch;
              }
            } catch (objIdError) {
              // Ignore ObjectId conversion errors
            }
          }
          
          return exactMatch;
        });
        
        console.log(`📨 Fallback query found ${conversationMessages.length} messages for this conversation`);
        
        // Add all found messages to the map
        conversationMessages.forEach(msg => {
          const msgId = String(msg._id);
          messageMap.set(msgId, msg);
        });
      } catch (fallbackError) {
        console.error('❌ Comprehensive fallback query error:', fallbackError);
      }
      
      allMessages = Array.from(messageMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA - dateB;
      });
      
      console.log(`📨 Total messages found: ${allMessages.length}`);
      
      // Log sample messages to see what format they're stored in
      console.log(`📊 Message query summary: ${allMessages.length} messages found`);
      if (allMessages.length > 0) {
        console.log('📊 Sample messages from database (first 3):');
        allMessages.slice(0, 3).forEach((msg, idx) => {
          console.log(`  Message ${idx + 1}:`, {
            _id: String(msg._id),
            sender: String(msg.sender),
            receiver: String(msg.receiver),
            senderType: typeof msg.sender,
            receiverType: typeof msg.receiver,
            deleted: msg.deleted,
            createdAt: msg.createdAt,
            content: msg.content?.substring(0, 30)
          });
        });
      } else {
        console.log('⚠️  WARNING: No messages found with any query strategy!');
        console.log(`⚠️  This might mean:`);
        console.log(`    1. No messages exist in the database for this conversation`);
        console.log(`    2. Messages might be stored with different ID formats`);
        console.log(`    3. Check the debug endpoint: /api/messages/debug/all`);
      }
      
      // PERMANENT MESSAGES: Never filter out messages - keep ALL messages permanently
      // CRITICAL: Return ALL messages regardless of deleted status for permanent history
      messages = allMessages;
      console.log(`📨 FINAL COUNT: ${messages.length} messages (ALL preserved for permanent history)`);
      
      console.log(`✅ Returning ${messages.length} messages for permanent history`);
      
      // Manually populate sender and receiver
      const senderIds = new Set();
      const receiverIds = new Set();
      
      messages.forEach(msg => {
        const senderId = String(msg.sender?._id || msg.sender);
        const receiverId = String(msg.receiver?._id || msg.receiver);
        
        // Only add valid ObjectIds
        if (mongoose.Types.ObjectId.isValid(senderId)) {
          senderIds.add(senderId);
        }
        if (mongoose.Types.ObjectId.isValid(receiverId)) {
          receiverIds.add(receiverId);
        }
      });
      
      // Fetch all users at once
      const allUserIds = [...senderIds, ...receiverIds];
      const usersMap = new Map();
      
      if (allUserIds.length > 0) {
        const users = await User.find({ 
          _id: { $in: allUserIds.map(id => new mongoose.Types.ObjectId(id)) } 
        })
          .select('username profilePicture isVerified')
          .lean();
        
        users.forEach(user => {
          usersMap.set(String(user._id), user);
        });
      }
      
      // Manually populate sender and receiver in messages
      messages = messages.map(msg => {
        const senderId = String(msg.sender?._id || msg.sender);
        const receiverId = String(msg.receiver?._id || msg.receiver);
        
        return {
          ...msg,
          sender: usersMap.get(senderId) || { _id: msg.sender, username: 'Unknown', profilePicture: null, isVerified: false },
          receiver: usersMap.get(receiverId) || { _id: msg.receiver, username: 'Unknown', profilePicture: null, isVerified: false }
        };
      });
      
      // Ensure all messages have proper format with timestamps
      messages = messages.map((msg, index) => {
        try {
          return {
            ...msg,
            _id: msg._id ? String(msg._id) : `temp-${index}-${Date.now()}`,
            createdAt: msg.createdAt 
              ? (msg.createdAt instanceof Date 
                  ? msg.createdAt.toISOString() 
                  : (typeof msg.createdAt === 'string' 
                      ? new Date(msg.createdAt).toISOString() 
                      : new Date().toISOString()))
              : new Date().toISOString(),
            updatedAt: msg.updatedAt 
              ? (msg.updatedAt instanceof Date 
                  ? msg.updatedAt.toISOString() 
                  : (typeof msg.updatedAt === 'string' 
                      ? new Date(msg.updatedAt).toISOString() 
                      : new Date().toISOString()))
              : new Date().toISOString(),
            sender: {
              ...(msg.sender || {}),
              _id: msg.sender?._id ? String(msg.sender._id) : String(msg.sender || 'unknown'),
              username: msg.sender?.username || 'Unknown',
              profilePicture: msg.sender?.profilePicture || null,
              isVerified: msg.sender?.isVerified || false
            },
            receiver: {
              ...(msg.receiver || {}),
              _id: msg.receiver?._id ? String(msg.receiver._id) : String(msg.receiver || 'unknown'),
              username: msg.receiver?.username || 'Unknown',
              profilePicture: msg.receiver?.profilePicture || null,
              isVerified: msg.receiver?.isVerified || false
            },
            content: String(msg.content || ''),
            read: Boolean(msg.read),
            deleted: Boolean(msg.deleted)
          };
        } catch (formatError) {
          console.error('Error formatting message:', formatError, msg);
          return null;
        }
      }).filter(msg => msg !== null); // Remove any null messages from formatting errors
      
      console.log(`✅ Formatted ${messages.length} messages with populated users`);
      if (messages.length > 0) {
        console.log('📊 Sample formatted message:', {
          _id: messages[0]._id,
          sender: messages[0].sender,
          receiver: messages[0].receiver,
          content: messages[0].content?.substring(0, 30),
          createdAt: messages[0].createdAt
        });
      }
    } catch (messageError) {
      console.error('❌ Error fetching/formatting messages:', messageError);
      console.error('❌ Error stack:', messageError.stack);
      messages = []; // Set to empty array on error
    }
    
    // Mark messages as read where current user is receiver
    if (messages.length > 0) {
      try {
        const normalizedCurrentUserId = String(currentUserId);
        const normalizedOtherUserId = String(otherUserId);
        
        // Build ID variants for update query
        const buildIdVariants = (id) => {
          const variants = [id, String(id)];
          if (mongoose.Types.ObjectId.isValid(id)) {
            variants.push(new mongoose.Types.ObjectId(id));
          }
          return variants;
        };
        
        const otherUserIdVariants = buildIdVariants(normalizedOtherUserId);
        const currentUserIdVariants = buildIdVariants(normalizedCurrentUserId);
        
        await Message.updateMany(
          {
            sender: { $in: otherUserIdVariants },
            receiver: { $in: currentUserIdVariants },
            read: false
          },
          {
            $set: {
              read: true,
              readAt: new Date()
            }
          }
        );
      } catch (updateError) {
        console.error('⚠️  Error marking messages as read:', updateError);
        // Don't fail the request if marking as read fails
      }
    }
    
    console.log(`📤 Sending ${messages.length} messages to client`);
    console.log('📤 Response preview:', {
      messageCount: messages.length,
      firstMessageId: messages[0]?._id,
      lastMessageId: messages[messages.length - 1]?._id,
      sampleContent: messages[0]?.content?.substring(0, 30)
    });
    
    // Ensure we always return an array, even if empty
    const response = { 
      messages: Array.isArray(messages) ? messages : []
    };
    
    console.log('📤 Final response structure:', {
      hasMessages: Array.isArray(response.messages),
      messageCount: response.messages.length
    });
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error in getMessages:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { receiverId, content } = req.body;
    
    console.log('📤 Send message request:', { currentUserId, receiverId, contentLength: content?.length });
    
    if (!receiverId || !content) {
      return res.status(400).json({ 
        message: 'Receiver ID and message content are required' 
      });
    }
    
    if (content.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    
    if (content.length > 1000) {
      return res.status(400).json({ 
        message: 'Message cannot exceed 1000 characters' 
      });
    }
    
    // Check mutual follow
    try {
      const isMutual = await checkMutualFollow(currentUserId, receiverId);
      if (!isMutual) {
        return res.status(403).json({ 
          message: 'You can only message users who follow you back' 
        });
      }
    } catch (mutualFollowError) {
      console.error('❌ Error checking mutual follow:', mutualFollowError);
      // Don't block the request if mutual follow check fails - allow access
      // This prevents 500 errors from blocking legitimate conversations
    }
    
    // Normalize IDs to strings for consistent storage (Mixed type compatibility)
    const normalizedSenderId = String(currentUserId);
    const normalizedReceiverId = String(receiverId);
    
    // Create message (permanently stored, never deleted)
    // IMPORTANT: Set deleted: false explicitly to ensure messages are never filtered out
    const message = new Message({
      sender: normalizedSenderId,
      receiver: normalizedReceiverId,
      content: content.trim(),
      read: false,
      deleted: false, // CRITICAL: Always false for permanent message history
      archived: false
    });
    
    // Save with error handling and verification
    try {
      await message.save();
      
      // Verify message was saved by querying it back immediately
      const savedMessage = await Message.findById(message._id);
      if (!savedMessage) {
        throw new Error('Message was not saved - verification failed');
      }
      
      // Verify message can be queried back immediately with the exact format we'll use later
      const verifyQueries = [
        { sender: normalizedSenderId, receiver: normalizedReceiverId, content: content.trim() },
      ];
      
      // Also try ObjectId if valid
      if (mongoose.Types.ObjectId.isValid(normalizedSenderId) && mongoose.Types.ObjectId.isValid(normalizedReceiverId)) {
        verifyQueries.push({
          sender: new mongoose.Types.ObjectId(normalizedSenderId),
          receiver: new mongoose.Types.ObjectId(normalizedReceiverId),
          content: content.trim()
        });
      }
      
      let verified = false;
      for (const vq of verifyQueries) {
        const verifyMessages = await Message.find(vq).sort({ createdAt: -1 }).limit(1).lean();
        if (verifyMessages.length > 0) {
          verified = true;
          break;
        }
      }
      
      console.log('✅ Message saved and verified:', {
        messageId: message._id.toString(),
        sender: normalizedSenderId,
        receiver: normalizedReceiverId,
        contentLength: content.trim().length,
        deleted: savedMessage.deleted,
        createdAt: savedMessage.createdAt,
        verifiedByQuery: verified,
        senderType: typeof savedMessage.sender,
        receiverType: typeof savedMessage.receiver,
        timestamp: new Date().toISOString()
      });
      
      if (!verified) {
        console.error('⚠️  WARNING: Message saved but not found by query! This indicates a query issue.');
        console.error('⚠️  Saved message sender type:', typeof savedMessage.sender, 'value:', savedMessage.sender);
        console.error('⚠️  Saved message receiver type:', typeof savedMessage.receiver, 'value:', savedMessage.receiver);
      }
    } catch (saveError) {
      console.error('❌ Error saving message:', saveError);
      console.error('❌ Save error details:', {
        name: saveError.name,
        message: saveError.message,
        code: saveError.code,
        sender: normalizedSenderId,
        receiver: normalizedReceiverId
      });
      throw saveError; // Re-throw to be caught by outer catch
    }
    
    // Manually populate sender and receiver (since they're Mixed types)
    let sender, receiver;
    try {
      sender = await User.findById(normalizedSenderId).select('username profilePicture isVerified').lean();
      receiver = await User.findById(normalizedReceiverId).select('username profilePicture isVerified').lean();
    } catch (populateError) {
      console.error('⚠️  Error populating users, using defaults:', populateError);
      sender = null;
      receiver = null;
    }
    
    const messageObj = {
      ...message.toObject(),
      _id: message._id.toString(),
      sender: sender || { _id: normalizedSenderId, username: 'Unknown', profilePicture: null, isVerified: false },
      receiver: receiver || { _id: normalizedReceiverId, username: 'Unknown', profilePicture: null, isVerified: false },
      createdAt: message.createdAt ? message.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: message.updatedAt ? message.updatedAt.toISOString() : new Date().toISOString()
    };
    
    // Get Socket.io instance
    const io = req.app.get('io');
    if (io) {
      // Emit to the receiver (only if they follow back)
      io.to(normalizedReceiverId).emit('newMessage', {
        message: messageObj,
        senderId: normalizedSenderId
      });
      
      // Also emit to sender for confirmation and real-time update
      io.to(normalizedSenderId).emit('messageSent', {
        message: messageObj
      });
      
      console.log(`📨 Message sent from ${normalizedSenderId} to ${normalizedReceiverId}`);
    }
    
    res.status(201).json({ message: messageObj });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Return appropriate error response
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        error: error.message 
      });
    }
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({ 
        message: 'Database error while saving message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to save message'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { senderId } = req.body;
    
    if (!senderId) {
      return res.status(400).json({ message: 'Sender ID is required' });
    }
    
    const result = await Message.updateMany(
      {
        sender: senderId,
        receiver: currentUserId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );
    
    // Emit read receipt
    const io = req.app.get('io');
    if (io) {
      io.to(senderId.toString()).emit('messagesRead', {
        receiverId: currentUserId.toString(),
        readAt: new Date()
      });
    }
    
    res.json({ 
      message: 'Messages marked as read',
      updatedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    const count = await Message.countDocuments({
      receiver: currentUserId,
      read: false
    });
    
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


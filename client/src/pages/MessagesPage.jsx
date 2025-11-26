import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { MessagesSkeleton } from '../components/SkeletonComponents';
import { useAuth } from '../contexts/AuthContext';
import { Search, Send, MoreVertical, Phone, Video } from 'lucide-react';
import axios from 'axios';
import getSocket from '../socket';
import { formatDistanceToNow, format } from 'date-fns';
import styles from '../styles/MessagesPage.module.css';

const MessagesPage = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const socket = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});

  // Initialize socket connection
  useEffect(() => {
    if (!currentUser) return;

    socket.current = getSocket();
    
    // If socket is null (no token), don't proceed
    if (!socket.current) {
      console.warn('⚠️ Socket not available - no token found');
      return;
    }
    
    // Wait for socket to connect if not already connected
    if (!socket.current.connected) {
      socket.current.on('connect', () => {
        console.log('🔌 Socket connected for messages');
      });
      // Don't return early - let it connect
    }

    // Listen for new messages (real-time)
    const handleNewMessage = (data) => {
      const { message } = data;
      
      if (!message || !message.sender || !message.receiver) return;
      
      // Check if message is for current user
      const isForCurrentUser = message.receiver._id === currentUser._id || 
                               message.receiver._id === currentUser.id;
      
      // If message is for current conversation, add it
      if (selectedConversation && 
          (message.sender._id === selectedConversation.user._id || 
           message.sender.id === selectedConversation.user._id)) {
        setMessages(prev => {
          // Check if message already exists (prevent duplicates)
          const exists = prev.some(m => m._id === message._id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
        scrollToBottom();
      }
      
      // Update conversation list for any new message
      if (isForCurrentUser || message.sender._id === currentUser._id || message.sender.id === currentUser.id) {
        updateConversationList(message);
      }
    };
    
    socket.current.on('newMessage', handleNewMessage);

    // Listen for message sent confirmation (optimistic update)
    const handleMessageSent = (data) => {
      const { message } = data;
      
      if (!message || !message.sender || !message.receiver) return;
      
      // Only handle if message is from current user
      const isFromCurrentUser = message.sender._id === currentUser._id || 
                                message.sender.id === currentUser.id;
      
      if (isFromCurrentUser && selectedConversation && 
          (message.receiver._id === selectedConversation.user._id || 
           message.receiver.id === selectedConversation.user._id)) {
        setMessages(prev => {
          // Check if message already exists (prevent duplicates)
          const exists = prev.some(m => m._id === message._id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
        scrollToBottom();
      }
      
      // Update conversation list
      if (isFromCurrentUser) {
        updateConversationList(message);
      }
    };
    
    socket.current.on('messageSent', handleMessageSent);

    // Listen for typing indicators
    socket.current.on('typing', (data) => {
      const { senderId, isTyping } = data;
      if (!senderId) return;
      
      // Normalize IDs for comparison (handle both string and ObjectId formats)
      const normalizedSenderId = String(senderId);
      const normalizedConversationUserId = selectedConversation 
        ? String(selectedConversation.user._id || selectedConversation.user.id)
        : null;
      
      if (selectedConversation && normalizedSenderId === normalizedConversationUserId) {
        setTypingUsers(prev => ({
          ...prev,
          [normalizedSenderId]: isTyping
        }));
        
        if (isTyping) {
          scrollToBottom();
        } else {
          // Clear typing indicator when user stops typing
          setTypingUsers(prev => {
            const updated = { ...prev };
            delete updated[normalizedSenderId];
            return updated;
          });
        }
      }
    });

    // Listen for user online/offline status
    socket.current.on('userOnline', (data) => {
      console.log('🟢 User online:', data.userId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(data.userId);
        return newSet;
      });
    });

    socket.current.on('userOffline', (data) => {
      console.log('🔴 User offline:', data.userId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    // Request initial online status for conversations when socket connects
    const handleSocketConnect = () => {
      console.log('🔌 Socket connected for messages');
      // Request online status for all conversation users
      if (conversations.length > 0) {
        const userIds = conversations.map(c => c.user._id);
        socket.current.emit('getOnlineStatus', { userIds });
      }
    };

    socket.current.on('connect', handleSocketConnect);
    
    // Listen for online status response
    socket.current.on('onlineStatus', (data) => {
      console.log('📊 Online status received:', data);
      if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
        // Normalize all user IDs to strings
        const normalizedOnlineUsers = data.onlineUsers.map(id => String(id));
        setOnlineUsers(new Set(normalizedOnlineUsers));
      }
    });

    // Listen for messages read
    socket.current.on('messagesRead', (data) => {
      // Update read status for messages
      if (selectedConversation && data.receiverId === currentUser._id) {
        setMessages(prev => prev.map(msg => 
          msg.sender._id === selectedConversation.user._id && !msg.read
            ? { ...msg, read: true, readAt: data.readAt }
            : msg
        ));
      }
    });

    // Handle socket disconnect
    const handleDisconnect = () => {
      console.log('🔌 Socket disconnected for messages');
    };
    
    socket.current.on('disconnect', handleDisconnect);

    return () => {
      if (socket.current) {
        socket.current.off('newMessage', handleNewMessage);
        socket.current.off('messageSent', handleMessageSent);
        socket.current.off('typing');
        socket.current.off('userOnline');
        socket.current.off('userOffline');
        socket.current.off('messagesRead');
        socket.current.off('connect', handleSocketConnect);
        socket.current.off('disconnect', handleDisconnect);
        socket.current.off('onlineStatus');
      }
      // Clear typing indicators on cleanup
      setTypingUsers({});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUser, selectedConversation, conversations]);

  // Fetch conversations
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchConversations = async () => {
      try {
        setLoading(true);
        console.log('📥 Fetching conversations for user:', currentUser._id);
        const response = await axios.get('/api/messages/conversations');
        console.log('📥 Conversations response:', response.data);
        const conversationsList = response.data.conversations || [];
        console.log(`📥 Found ${conversationsList.length} conversations`);
        
        // Deduplicate conversations by user._id
        const uniqueConversations = Array.from(
          new Map(conversationsList.map(conv => [String(conv.user._id), conv])).values()
        );
        console.log(`📥 Deduplicated to ${uniqueConversations.length} conversations`);
        
        // Log conversation details
        if (uniqueConversations.length > 0) {
          console.log('📥 Conversation details:', uniqueConversations.map(c => ({
            userId: c.user._id,
            username: c.user.username,
            lastMessage: c.lastMessage?.substring(0, 30),
            lastMessageTime: c.lastMessageTime
          })));
        }
        
        setConversations(uniqueConversations);
        
        // Request online status for all conversation users after fetching
        if (socket.current && socket.current.connected && uniqueConversations.length > 0) {
          const userIds = uniqueConversations.map(c => c.user._id);
          socket.current.emit('getOnlineStatus', { userIds });
        }
      } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        console.error('❌ Error details:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [currentUser]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation || !currentUser) {
      // Clear messages if no conversation is selected
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        console.log('📥 Fetching messages for conversation:', {
          userId: selectedConversation.user._id,
          username: selectedConversation.user.username
        });
        
        // Fetch user messages
        const response = await axios.get(`/api/messages/${selectedConversation.user._id}`);
        const fetchedMessages = response.data.messages || [];
        console.log('📥 User messages response:', {
          messageCount: fetchedMessages.length,
          userId: selectedConversation.user._id,
          sampleIds: fetchedMessages.slice(0, 3).map(m => m._id),
          responseData: response.data
        });
        
        // Mark messages as read
        if (fetchedMessages.length > 0) {
          try {
            await axios.post('/api/messages/read', {
              senderId: selectedConversation.user._id
            });
            // Dispatch event to update unread count in navigation
            window.dispatchEvent(new CustomEvent('messages:read'));
          } catch (readError) {
            console.error('⚠️  Error marking messages as read:', readError);
            // Don't fail the whole request if marking as read fails
          }
        }
        
        // Deduplicate messages by _id and ensure proper structure
        const uniqueMessages = Array.from(
          new Map(fetchedMessages.map(msg => [String(msg._id), msg])).values()
        );
        
        // Sort by createdAt to ensure chronological order
        uniqueMessages.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateA - dateB;
        });
        
        console.log('✅ Setting messages:', {
          count: uniqueMessages.length,
          firstMessage: uniqueMessages[0] ? {
            _id: uniqueMessages[0]._id,
            content: uniqueMessages[0].content?.substring(0, 30),
            sender: uniqueMessages[0].sender?._id,
            createdAt: uniqueMessages[0].createdAt
          } : null,
          lastMessage: uniqueMessages[uniqueMessages.length - 1] ? {
            _id: uniqueMessages[uniqueMessages.length - 1]._id,
            content: uniqueMessages[uniqueMessages.length - 1].content?.substring(0, 30),
            createdAt: uniqueMessages[uniqueMessages.length - 1].createdAt
          } : null
        });
        
        setMessages(uniqueMessages);
        
        // Scroll to bottom after a short delay to ensure DOM is updated
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } catch (error) {
        console.error('❌ Error fetching messages:', error);
        console.error('❌ Error response:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
        
        if (error.response?.status === 403) {
          alert('You can only message users who follow you back');
          setSelectedConversation(null);
        } else if (error.response?.status === 500) {
          console.error('❌ Server error when fetching messages. Check server logs.');
          // Don't clear messages on 500 - might be a temporary server issue
          // Instead, show an error but keep trying
        } else {
          // For other errors, clear messages
          setMessages([]);
        }
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
    
    // Clear typing indicators when conversation changes
    setTypingUsers({});
  }, [selectedConversation, currentUser]);

  // Update conversation list when new message arrives
  const updateConversationList = (message) => {
    const partnerId = message.sender._id === currentUser._id 
      ? message.receiver._id 
      : message.sender._id;
    
    const partner = message.sender._id === currentUser._id 
      ? message.receiver 
      : message.sender;
    
    setConversations(prev => {
      // Normalize partnerId for comparison
      const normalizedPartnerId = String(partnerId);
      const existing = prev.find(c => String(c.user._id) === normalizedPartnerId);
      
      if (existing) {
        // Update existing conversation
        const updated = prev.map(c => 
          String(c.user._id) === normalizedPartnerId
            ? {
                ...c,
                lastMessage: message.content,
                lastMessageTime: message.createdAt,
                lastMessageSenderId: message.sender._id,
                unread: message.receiver._id === currentUser._id && !message.read
                  ? c.unread + 1
                  : c.unread
              }
            : c
        ).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
        
        // Deduplicate after update
        return Array.from(
          new Map(updated.map(conv => [String(conv.user._id), conv])).values()
        );
      } else {
        // Add new conversation
        const newConv = {
          user: {
            _id: partner._id,
            username: partner.username,
            profilePicture: partner.profilePicture
          },
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unread: message.receiver._id === currentUser._id && !message.read ? 1 : 0,
          lastMessageSenderId: message.sender._id
        };
        
        // Check if it already exists before adding
        const alreadyExists = prev.some(c => String(c.user._id) === normalizedPartnerId);
        if (alreadyExists) {
          return prev; // Don't add duplicate
        }
        
        return [newConv, ...prev];
      }
    });
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket.current || !selectedConversation) return;

    // Emit typing indicator
    socket.current.emit('typing', {
      receiverId: selectedConversation.user._id,
      isTyping: true
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket.current && selectedConversation) {
        socket.current.emit('typing', {
          receiverId: selectedConversation.user._id,
          isTyping: false
        });
      }
    }, 3000);
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Stop typing indicator
    if (socket.current && selectedConversation) {
      socket.current.emit('typing', {
        receiverId: selectedConversation.user._id,
        isTyping: false
      });
    }

    try {
      // Send message to user
      const response = await axios.post('/api/messages/send', {
        receiverId: selectedConversation.user._id,
        content: messageText
      });
      
      // Add message to local state (optimistic update with deduplication)
      const newMessage = {
        ...response.data.message,
        sender: currentUser,
        receiver: selectedConversation.user
      };
      setMessages(prev => {
        const exists = prev.some(m => String(m._id) === String(newMessage._id));
        return exists ? prev : [...prev, newMessage];
      });
      scrollToBottom();
      
      // Update conversation list
      updateConversationList(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status === 403) {
        alert('You can only message users who follow you back');
      } else {
        alert('Failed to send message. Please try again.');
      }
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv =>
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time for messages
  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(messageDate, 'HH:mm');
    } else if (diffInHours < 168) { // 7 days
      return format(messageDate, 'EEE HH:mm');
    } else {
      return format(messageDate, 'MMM d, HH:mm');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  // Get default profile picture
  const getDefaultProfilePicture = (user) => {
    if (user?.profilePicture) return user.profilePicture;
    return 'https://via.placeholder.com/40/6366f1/ffffff?text=👤';
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <MessagesSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation />
      
      <div className={styles.content}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={styles.grid}
        >
          {/* Left Column - Conversations */}
          <motion.div variants={itemVariants} className={styles.conversationsColumn}>
            <div className={styles.conversationsCard}>
              <div className={styles.conversationsHeader}>
                <h2 className={styles.conversationsTitle}>Messages</h2>
                <p className={styles.conversationsSubtitle}>
                  Chat with developers you follow
                </p>
              </div>

              {/* Search */}
              <div className={styles.search}>
                <Search className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {/* Conversations List */}
              <div className={styles.conversationsList}>
                {filteredConversations.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateText}>
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </p>
                    <p className={styles.emptyStateSubtext}>
                      {searchQuery 
                        ? 'Try a different search term' 
                        : 'You can only message users who follow you back. Follow someone and ask them to follow you back to start chatting!'}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conversation, index) => {
                    // Normalize user ID for online status check
                    const userId = String(conversation.user._id);
                    const isOnline = onlineUsers.has(userId) || onlineUsers.has(conversation.user._id);
                    const isSelected = selectedConversation?.user._id === conversation.user._id;
                    // Use combination of _id and index to ensure unique keys
                    const uniqueKey = `${userId}-${index}-${conversation.lastMessageTime || Date.now()}`;
                    
                    return (
                  <motion.div
                        key={uniqueKey}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedConversation(conversation);
                          // Reset unread count when selecting
                          setConversations(prev => prev.map(c => 
                            c.user._id === conversation.user._id
                              ? { ...c, unread: 0 }
                              : c
                          ));
                        }}
                    className={`${styles.conversation} ${
                          isSelected
                        ? styles.conversationActive
                        : styles.conversationInactive
                    }`}
                  >
                    <div className={styles.conversationContent}>
                      <div className={styles.conversationAvatarContainer}>
                        <img
                              src={getDefaultProfilePicture(conversation.user)}
                              alt={conversation.user.username}
                          className={styles.conversationAvatar}
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/40/6366f1/ffffff?text=👤';
                              }}
                        />
                        <div className={`${styles.conversationStatus} ${
                              isOnline ? styles.conversationStatusOnline : styles.conversationStatusOffline
                        }`}></div>
                      </div>
                      <div className={styles.conversationInfo}>
                        <div className={styles.conversationHeader}>
                          <p className={styles.conversationName}>
                                {conversation.user.username}
                          </p>
                              <span className={styles.conversationTimestamp}>
                                {(() => {
                                  // Only show Online or Recently online - no time calculations
                                  if (isOnline) {
                                    return 'Online';
                                  } else {
                                    return 'Recently online';
                                  }
                                })()}
                              </span>
                        </div>
                            <p className={styles.conversationMessage}>
                              {conversation.lastMessageSenderId === currentUser._id && 'You: '}
                              {conversation.lastMessage}
                            </p>
                      </div>
                          {conversation.unread > 0 && !isSelected && (
                        <div className={styles.conversationUnread}>
                          {conversation.unread}
                        </div>
                      )}
                    </div>
                  </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Chat */}
          <motion.div variants={itemVariants} className={styles.chatColumn}>
            <div className={styles.chatCard}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className={styles.chatHeader}>
                    <div className={styles.chatHeaderInfo}>
                      <img
                        src={getDefaultProfilePicture(selectedConversation.user)}
                        alt={selectedConversation.user.username}
                        className={styles.chatHeaderAvatar}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/40/6366f1/ffffff?text=👤';
                        }}
                        onClick={() => navigate(`/users/${selectedConversation.user._id}`)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className={styles.chatHeaderDetails}>
                        <p className={styles.chatHeaderName}>
                          {selectedConversation.user.username}
                        </p>
                        <p className={styles.chatHeaderStatus}>
                          {(() => {
                            // Only show Online or Recently online - no "years ago" or other time formats
                            const isOnline = onlineUsers.has(String(selectedConversation.user._id)) || onlineUsers.has(selectedConversation.user._id);
                            if (isOnline) {
                              return '🟢 Online';
                            } else {
                              return '🟡 Recently online';
                            }
                          })()}
                          {typingUsers[selectedConversation.user._id] && ' • Typing...'}
                        </p>
                      </div>
                    </div>
                    <div className={styles.chatHeaderActions}>
                      <button 
                        className={styles.chatHeaderAction}
                        onClick={() => navigate(`/users/${selectedConversation.user._id}`)}
                        title="View Profile"
                      >
                        <MoreVertical className={styles.chatHeaderActionIcon} />
                      </button>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className={styles.chatMessages}>
                    {loadingMessages ? (
                      <div className={styles.chatLoading}>
                        <div className="loading loading-spinner loading-md"></div>
                      </div>
                    ) : (
                      <div className={styles.chatMessagesList}>
                        {messages.length === 0 ? (
                          <div className={styles.chatEmpty}>
                            <p className={styles.chatEmptySubtext}>
                              Start the conversation by sending a message!
                            </p>
                        </div>
                        ) : (
                          messages.map((message, index) => {
                            const isSent = message.sender._id === currentUser._id;
                            // Use combination of _id and index to ensure unique keys
                            const uniqueKey = `${message._id}-${index}-${message.createdAt || Date.now()}`;
                            return (
                              <div
                                key={uniqueKey}
                                className={`${styles.chatMessage} ${
                                  isSent ? styles.chatMessageSent : styles.chatMessageReceived
                                }`}
                              >
                                <div className={`${styles.chatMessageBubble} ${
                                  isSent ? styles.chatMessageBubbleSent : styles.chatMessageBubbleReceived
                                }`}>
                                  <p>{message.content}</p>
                                  <span className={styles.chatMessageTime}>
                                    {formatMessageTime(message.createdAt)}
                                    {isSent && message.read && (
                                      <span className={styles.chatMessageRead}>✓✓</span>
                                    )}
                                  </span>
                        </div>
                      </div>
                            );
                          })
                        )}
                        {selectedConversation && typingUsers[String(selectedConversation.user._id)] && (
                          <div className={`${styles.chatMessage} ${styles.chatMessageReceived}`}>
                            <div className={`${styles.chatMessageBubble} ${styles.chatMessageBubbleReceived}`}>
                              <div className={styles.typingIndicator}>
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className={styles.chatInput}>
                    <form onSubmit={handleSendMessage} className={styles.chatInputForm}>
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        className={styles.chatInputField}
                        maxLength="1000"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className={styles.chatInputSubmit}
                      >
                        {sending ? (
                          <div className="loading loading-spinner loading-xs"></div>
                        ) : (
                          <>
                        <Send className={styles.chatInputSubmitIcon} />
                        <span className={styles.chatInputSubmitText}>Send</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className={styles.chatEmpty}>
                  <div className={styles.chatEmptyContent}>
                    <div className={styles.chatEmptyIcon}>
                      <Search className={styles.chatEmptyIconSvg} />
                    </div>
                    <p className={styles.chatEmptyTitle}>Select a conversation</p>
                    <p className={styles.chatEmptySubtitle}>
                      Choose a conversation from the list to start chatting
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default MessagesPage;

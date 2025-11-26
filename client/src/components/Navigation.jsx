import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Home, MessageCircle, User, LogOut, Code, Search as SearchIcon } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';
import getSocket from '../socket';
import ThemeToggle from './ThemeToggle';
import NotificationIcon from './NotificationIcon';
import { NavigationSkeleton } from './SkeletonComponents';
import styles from '../styles/Navigation.module.css';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const socketRef = useRef(null);

  // Function to get default profile picture based on gender
  const getDefaultProfilePicture = (user) => {
    if (!user) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiM2MzY2ZjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOS4zMzEzMyAxNCA0IDE1LjMzMTMgNCAxOFYyMEgyMFYxOEMyMCAxNS4zMzEzIDE0LjY2ODcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
    
    const gender = user.gender;
    if (gender === 'male') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiMzYjgyZjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOS4zMzEzMyAxNCA0IDE1LjMzMTMgNCAxOFYyMEgyMFYxOEMyMCAxNS4zMzEzIDE0LjY2ODcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
    } else if (gender === 'female') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiNlYzQ4OTkiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOS4zMzEzMyAxNCA0IDE1LjMzMTMgNCAxOFYyMEgyMFYxOEMyMCAxNS4zMzEzIDE0LjY2ODcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
    } else {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiM2MzY2ZjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOS4zMzEzMyAxNCA0IDE1LjMzMTMgNCAxOFYyMEgyMFYxOEMyMCAxNS4zMzEzIDE0LjY2ODcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { path: '/home', label: 'Home', icon: Home },
    { path: '/messages', label: 'Messages', icon: MessageCircle },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  // Fetch unread message count (wrapped in useCallback to avoid recreation)
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/messages/unread/count', {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      if (response.data && response.data.unreadCount !== undefined) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      // Silently handle 401 errors (token will be cleared by interceptor)
      if (error?.response?.status !== 401) {
        console.error('Error fetching unread count:', error);
      }
    }
  }, [user]);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    if (user && !authLoading) {
      fetchUnreadCount();
      
      // Set up periodic refresh every 60 seconds to keep count accurate
      // Less frequent to avoid interfering with real-time updates
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 60000); // Refresh every 60 seconds
      
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user, authLoading, fetchUnreadCount]);

  // Listen for real-time message updates via socket
  useEffect(() => {
    if (!user || authLoading) return;

    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;

    // Listen for new messages
    const handleNewMessage = (data) => {
      const { message } = data;
      const currentUserId = user._id || user.id;
      
      if (!message || !currentUserId) return;
      
      // Extract receiver and sender IDs - handle multiple possible structures
      let receiverId = null;
      let senderId = null;
      
      if (message.receiver) {
        receiverId = message.receiver._id || message.receiver.id || message.receiver;
      }
      
      if (message.sender) {
        senderId = message.sender._id || message.sender.id || message.sender;
      }
      
      // Also check if receiver/sender are directly in message (fallback)
      if (!receiverId && message.receiverId) {
        receiverId = message.receiverId;
      }
      if (!senderId && message.senderId) {
        senderId = message.senderId;
      }
      
      // Only increment count if message is for current user AND not sent by current user
      if (receiverId && senderId) {
        const receiverIdStr = String(receiverId);
        const senderIdStr = String(senderId);
        const currentUserIdStr = String(currentUserId);
        
        // Only increment if message is for current user AND not sent by current user
        if (receiverIdStr === currentUserIdStr && senderIdStr !== currentUserIdStr) {
          // Don't increment if user is currently on messages page (they'll see it immediately)
          const isOnMessagesPage = location.pathname === '/messages';
          
          if (!isOnMessagesPage) {
            console.log('📨 New message received, incrementing unread count');
            // Increment unread count immediately for instant feedback
            // Don't refetch immediately - trust the local increment
            // The periodic refresh will sync with server later
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log(`📨 Unread count updated: ${prev} -> ${newCount}`);
              return newCount;
            });
          }
          // If user is on messages page, do nothing - message will be marked as read automatically
        }
      }
    };

    socket.on('newMessage', handleNewMessage);
    
    // Also listen for messageSent to handle when user sends a message
    // Note: We don't need to do anything here - the sender shouldn't see their own message as unread
    // The count will be synced via periodic refresh
    const handleMessageSent = () => {
      // No action needed - sender's count shouldn't change
    };
    
    socket.on('messageSent', handleMessageSent);

    // Listen for messages marked as read (when user views messages)
    const handleLocalMessagesRead = () => {
      setUnreadCount(0);
      // Also refetch to ensure accuracy
      fetchUnreadCount();
    };

    window.addEventListener('messages:read', handleLocalMessagesRead);
    
    // Listen for socket messagesRead event
    const handleSocketMessagesRead = () => {
      setUnreadCount(0);
      fetchUnreadCount();
    };
    
    socket.on('messagesRead', handleSocketMessagesRead);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('newMessage', handleNewMessage);
        socketRef.current.off('messageSent', handleMessageSent);
        socketRef.current.off('messagesRead', handleSocketMessagesRead);
      }
      window.removeEventListener('messages:read', handleLocalMessagesRead);
    };
  }, [user, authLoading, location.pathname, fetchUnreadCount]);

  // Update unread count when navigating to messages page
  // Note: Count is cleared when clicking the Messages button, not when already on the page
  // This effect only refetches to sync with server after messages are marked as read
  useEffect(() => {
    if (location.pathname === '/messages') {
      // Small delay to allow messages page to mark messages as read first
      const timeout = setTimeout(() => {
        fetchUnreadCount();
      }, 1000); // Increased delay to ensure messages are marked as read
      
      return () => clearTimeout(timeout);
    }
  }, [location.pathname, fetchUnreadCount]);

  // Debounced user search - show suggestions as user types
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    // Show loading state immediately
    setIsSearching(true);
    
    // Reduced debounce delay for faster suggestions
    const id = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/users`, {
          params: {
            search: q,
            limit: 8
          },
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {},
          timeout: 5000
        });
        
        const data = response?.data || {};
        const users = Array.isArray(data?.users) ? data.users : [];
        console.log('Search results:', users); // Debug log
        setSearchResults(users);
      } catch (e) {
        console.error('Search error:', e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200); // Reduced from 350ms to 200ms for faster response
    
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Close search on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!isSearchOpen) return;
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isSearchOpen]);

  // Close search on navigation
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [location.pathname]);

  // Show skeleton loading while auth is loading (after hooks)
  if (authLoading) {
    return <NavigationSkeleton />;
  }

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="modern-nav"
    >
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={styles.logo}
            onClick={() => navigate('/home')}
          >
            <div className={styles.logoContent}>
              <Code className={styles.logoIcon} />
              <span className={styles.logoText}>DevLovers</span>
            </div>
          </motion.div>

          {/* Navigation Links */}
          <div className={styles.links}>
            {/* Search Tab that expands into search input */}
            <motion.div
              className={`${styles.searchContainer} ${isSearchOpen ? styles.searchContainerExpanded : ''}`}
              ref={searchContainerRef}
              tabIndex={-1}
              animate={{
                width: isSearchOpen ? 280 : 'auto',
                borderRadius: isSearchOpen ? 12 : 8,
              }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              {!isSearchOpen ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                  className={`${styles.link} ${styles.linkInactive}`}
                  title="Search"
                >
                  <SearchIcon className={styles.linkIcon} />
                  <span className={styles.linkText}>Search</span>
                </motion.button>
              ) : (
                <motion.div
                  className={styles.searchExpanded}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  <motion.input
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchQuery(value);
                      console.log('Search query changed:', value); // Debug
                    }}
                    placeholder="Search profiles..."
                    className={styles.searchInput}
                    ref={searchInputRef}
                    autoFocus
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: '100%' }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (searchResults.length > 0) {
                          const u = searchResults[0];
                          if (u?._id) {
                            if (u._id === user?._id) navigate('/profile');
                            else navigate(`/users/${u._id}`);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            setSearchResults([]);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className={styles.searchCloseButton}
                    title="Close search"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.2 }}
                  >
                    ×
                  </motion.button>
                </motion.div>
              )}

              {/* Search Results Dropdown - Show suggestions as user types */}
              <AnimatePresence mode="wait">
                {isSearchOpen && searchQuery.trim().length > 0 && (
                  <motion.div
                    className={styles.searchResults}
                    initial={{ opacity: 0, y: -12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.9 }}
                    transition={{ 
                      duration: 0.2, 
                      ease: [0.4, 0, 0.2, 1],
                      scale: { duration: 0.15 }
                    }}
                    style={{ display: 'block' }}
                  >
                    {isSearching ? (
                      <div className={styles.searchLoading}>
                        <span>Searching...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className={styles.searchEmpty}>
                        <span>No users found for "{searchQuery}"</span>
                      </div>
                    ) : (
                      <>
                        <div className={styles.searchResultsHeader}>
                          <span className={styles.searchResultsTitle}>
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                          </span>
                        </div>
                        {searchResults.map((u) => (
                          <motion.button
                            key={u._id}
                            className={styles.searchItem}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (u._id === user?._id) navigate('/profile');
                              else navigate(`/users/${u._id}`);
                              setSearchQuery('');
                              setSearchResults([]);
                              setIsSearchOpen(false);
                            }}
                          >
                            <img 
                              src={u.profilePicture || getDefaultProfilePicture(u)} 
                              alt={u.username} 
                              className={styles.searchItemAvatar} 
                              onError={(e) => {
                                e.target.src = getDefaultProfilePicture(u);
                              }} 
                            />
                            <div className={styles.searchItemInfo}>
                              <span className={styles.searchItemName}>{u.username}</span>
                              {u.bio && (
                                <span className={styles.searchItemHint}>
                                  {u.bio.length > 30 ? `${u.bio.substring(0, 30)}...` : u.bio}
                                </span>
                              )}
                            </div>
                            {u._id === user?._id ? (
                              <span className={styles.searchItemYou}>You</span>
                            ) : null}
                            {(u.isVerified === true || u.isVerified === 'true') && (
                              <span className={styles.searchItemVerified} title="Verified">✓</span>
                            )}
                          </motion.button>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isMessagesItem = item.path === '/messages';
              const showNotification = isMessagesItem && unreadCount > 0;
              
              return (
                <motion.button
                  key={item.path}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    navigate(item.path);
                    // Clear unread count when navigating to messages
                    if (isMessagesItem && unreadCount > 0) {
                      setUnreadCount(0);
                      // Dispatch event to mark messages as read
                      window.dispatchEvent(new CustomEvent('messages:read'));
                    }
                  }}
                  className={`${styles.link} ${
                    isActive(item.path)
                      ? styles.linkActive
                      : styles.linkInactive
                  }`}
                >
                  <div className={styles.linkIconContainer}>
                    <Icon className={styles.linkIcon} />
                    {showNotification && (
                      <span 
                        className={styles.notificationDot}
                        title={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
                      />
                    )}
                  </div>
                  <span className={styles.linkText}>{item.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* User Menu */}
          <div className={styles.userMenu}>
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Icon */}
            <NotificationIcon currentUser={user} getDefaultProfilePicture={getDefaultProfilePicture} />

            {/* User Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className={styles.userAvatar}
              onClick={() => navigate('/profile')}
            >
              <img
                src={user?.profilePicture || getDefaultProfilePicture(user)}
                alt={user?.username}
                className={styles.userImage}
                onError={(e) => {
                  e.target.src = getDefaultProfilePicture(user);
                }}
              />
              <div className={styles.userInfo}>
                <p className={styles.userName}>{user?.username}</p>
                <p className={styles.userRole}>Developer</p>
              </div>
            </motion.div>

            {/* Logout Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className={styles.logoutButton}
              title="Logout"
            >
              <LogOut className={styles.logoutIcon} />
            </motion.button>

            {/* Mobile Menu Button */}
            <button 
              className={styles.mobileMenuButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className={styles.mobileMenuIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.mobileMenu}
          >
            <div className={styles.mobileLinks}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.path}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigate(item.path);
                      setIsMenuOpen(false);
                    }}
                    className={`${styles.mobileLink} ${
                      isActive(item.path)
                        ? styles.linkActive
                        : styles.linkInactive
                    }`}
                  >
                    <Icon className={styles.mobileLinkIcon} />
                    <span className={styles.mobileLinkText}>{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navigation;




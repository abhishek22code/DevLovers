import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import axios from 'axios';
import getSocket from '../socket';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/NotificationIcon.module.css';

const NotificationIcon = ({ currentUser, getDefaultProfilePicture }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const modalRef = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!currentUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/notifications/unread/count', {
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
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications?limit=50');
      if (response.data && response.data.notifications) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count on mount
  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [currentUser]);

  // Fetch notifications when modal opens
  useEffect(() => {
    if (showModal && currentUser) {
      fetchNotifications();
    }
  }, [showModal, currentUser]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!currentUser) return;

    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;

    const handleNewNotification = (data) => {
      const { notification } = data;
      
      // Notification is already filtered by server for current user
      // Just verify it's for us by checking notification.user matches current user
      if (notification) {
        const notificationUserId = notification.user?._id || notification.user?.id || notification.user;
        const currentUserId = currentUser._id || currentUser.id;
        
        // If user field is not in notification, assume it's for current user (server already filtered)
        if (!notificationUserId || String(notificationUserId) === String(currentUserId)) {
          // Increment unread count
          setUnreadCount(prev => prev + 1);
          
          // Add notification to list if modal is open
          if (showModal) {
            setNotifications(prev => [notification, ...prev]);
          }
        }
      }
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('newNotification', handleNewNotification);
      }
    };
  }, [currentUser, showModal]);

  // Mark all notifications as read when modal opens
  useEffect(() => {
    if (showModal && unreadCount > 0) {
      markAllAsRead();
    }
  }, [showModal]);

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await axios.post('/api/notifications/read');
      setUnreadCount(0);
      // Update notifications to mark as read
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark notification as read
    if (!notification.read) {
      try {
        await axios.post(`/api/notifications/${notification._id}/read`);
        setNotifications(prev => prev.map(notif => 
          notif._id === notification._id ? { ...notif, read: true } : notif
        ));
        if (unreadCount > 0) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to user profile
    if (notification.fromUser && notification.fromUser._id) {
      navigate(`/users/${notification.fromUser._id}`);
      setShowModal(false);
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowModal(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowModal(false);
    }, 200); // Small delay to allow moving cursor to modal
    setHoverTimeout(timeout);
  };

  if (!currentUser) return null;

  return (
    <div 
      className={styles.notificationWrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.notificationIcon}>
        <Bell className={styles.bellIcon} />
        {unreadCount > 0 && (
          <span className={styles.notificationDot}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={styles.notificationModal}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={styles.markAllReadButton}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className={styles.modalContent}>
              {loading ? (
                <div className={styles.loading}>Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className={styles.empty}>No notifications yet</div>
              ) : (
                <div className={styles.notificationsList}>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <img
                        src={notification.fromUser?.profilePicture || getDefaultProfilePicture(notification.fromUser)}
                        alt={notification.fromUser?.username}
                        className={styles.notificationAvatar}
                        onError={(e) => {
                          e.target.src = getDefaultProfilePicture(notification.fromUser);
                        }}
                      />
                      <div className={styles.notificationContent}>
                        <p className={styles.notificationText}>
                          {notification.type === 'follow' && (
                            <>
                              <strong>{notification.fromUser?.username || 'Someone'}</strong> started following you
                            </>
                          )}
                        </p>
                        <p className={styles.notificationTime}>
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className={styles.unreadIndicator} />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationIcon;


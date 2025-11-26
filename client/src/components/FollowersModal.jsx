import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Search, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../styles/FollowersModal.module.css';

const FollowersModal = ({ isOpen, onClose, userId, type = 'followers' }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const endpoint = type === 'followers' 
        ? `/api/users/${userId}/followers`
        : `/api/users/${userId}/following`;
      const response = await axios.get(endpoint);
      setUsers(response.data[type] || []);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [type, userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers();
    } else {
      setUsers([]);
      setSearchQuery('');
    }
  }, [fetchUsers, isOpen, userId]);

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDefaultProfilePicture = (user) => {
    if (!user) return 'https://via.placeholder.com/40/6366f1/ffffff?text=DL';
    
    const gender = user.gender;
    if (gender === 'male') {
      return 'https://via.placeholder.com/40/3b82f6/ffffff?text=👨';
    } else if (gender === 'female') {
      return 'https://via.placeholder.com/40/ec4899/ffffff?text=👩';
    } else {
      return 'https://via.placeholder.com/40/6366f1/ffffff?text=👤';
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/users/${userId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className={styles.modal}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>
              {type === 'followers' ? 'Followers' : 'Following'}
            </h2>
            <button onClick={onClose} className={styles.closeButton}>
              <X className={styles.closeIcon} />
            </button>
          </div>

          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder={`Search ${type}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.content}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className={styles.usersList}>
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user._id || user.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleUserClick(user._id || user.id)}
                    className={styles.userItem}
                  >
                    <img
                      src={user.profilePicture || getDefaultProfilePicture(user)}
                      alt={user.username}
                      className={styles.userAvatar}
                      onError={(e) => {
                        e.target.src = getDefaultProfilePicture(user);
                      }}
                    />
                    <div className={styles.userInfo}>
                      <div className={styles.userNameRow}>
                        <p className={styles.userName}>{user.username}</p>
                        {(user.isVerified === true || user.isVerified === 'true') && (
                          <span className={styles.verifiedBadge} title="This user is verified">
                            <BadgeCheck className={styles.verifiedIcon} />
                          </span>
                        )}
                      </div>
                      {user.bio && (
                        <p className={styles.userBio}>{user.bio}</p>
                      )}
                      {user.skills && user.skills.length > 0 && (
                        <div className={styles.userSkills}>
                          {user.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className={styles.skillTag}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <User className={styles.userIcon} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <User className={styles.emptyIcon} />
                <p className={styles.emptyText}>
                  {searchQuery 
                    ? `No ${type} match "${searchQuery}"`
                    : `No ${type} yet`
                  }
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FollowersModal;


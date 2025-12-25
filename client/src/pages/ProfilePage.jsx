import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '../components/Navigation';
import styles from '../styles/ProfilePage.module.css';
import PostCard from '../components/PostCard';
import { ProfileSkeleton, PostCardSkeleton } from '../components/SkeletonComponents';
import { useAuth } from '../contexts/AuthContext';
import FollowersModal from '../components/FollowersModal';
import { 
  Edit, 
  Save, 
  X, 
  Briefcase,
  BadgeCheck,
  Trash2
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';

// Predefined skills list
const PREDEFINED_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
  'React', 'Vue', 'Angular', 'Next.js', 'Svelte', 'Express', 'Node.js', 'Django', 'Flask', 'Spring',
  'HTML', 'CSS', 'SASS', 'Tailwind', 'Bootstrap', 'Material-UI', 'Styled Components',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase', 'Supabase',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'CI/CD', 'Jenkins',
  'REST API', 'GraphQL', 'WebSocket', 'Microservices', 'DevOps',
  'Machine Learning', 'Data Science', 'AI', 'TensorFlow', 'PyTorch',
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android',
  'Linux', 'Windows', 'MacOS', 'System Design', 'Algorithms', 'Data Structures'
];


const ProfilePage = () => {
  const { user, updateProfile, deleteProfile } = useAuth();
  const navigate = useNavigate();
  const [userPosts, setUserPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    skills: user?.skills || [],
    profilePicture: user?.profilePicture || ''
  });
  const [skillsInput, setSkillsInput] = useState('');
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const skillsInputRef = useRef(null);
  const skillsContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const userId = user?._id;
  const userIdRef = useRef(userId);

  // Update ref when userId changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const fetchUserPosts = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${currentUserId}/posts?limit=20`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      
      // Even if response is not ok, try to parse JSON (might be empty posts)
      const data = await response.json().catch(() => ({ posts: [] }));
      
      const posts = Array.isArray(data?.posts) ? data.posts : Array.isArray(data?.data) ? data.data : [];
      
      // More robust filtering - ensure author exists
      const sanitized = posts.filter(p => {
        return p && 
               p._id && 
               p.author && 
               (typeof p.author === 'object' ? p.author.username : true);
      });
      
      setUserPosts(sanitized);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      // Set empty array instead of keeping old data
      setUserPosts([]);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - uses ref

  // Fetch posts when user changes
  useEffect(() => {
    if (userId) {
      fetchUserPosts();
    }
  }, [userId, fetchUserPosts]);

  // Update editData only when user changes and not editing
  useEffect(() => {
    if (user && !isEditing) {
      setEditData({
        username: user.username || '',
        bio: user.bio || '',
        skills: user.skills || [],
        profilePicture: user.profilePicture || ''
      });
      setSkillsInput('');
    }
  }, [user?.username, user?.bio, user?.skills, user?.profilePicture, isEditing]);

  // Filter predefined skills based on input
  useEffect(() => {
    if (skillsInput.trim() && isEditing) {
      const input = skillsInput.trim().toLowerCase();
      const filtered = PREDEFINED_SKILLS.filter(skill => 
        skill.toLowerCase().includes(input) && 
        !editData.skills.includes(skill)
      ).slice(0, 8); // Show max 8 suggestions
      setFilteredSuggestions(filtered);
      setShowSkillSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSkillSuggestions(false);
    }
  }, [skillsInput, editData.skills, isEditing]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (skillsContainerRef.current && !skillsContainerRef.current.contains(event.target)) {
        setShowSkillSuggestions(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  // Consume any pending posts buffered in localStorage (only once on mount)
  useEffect(() => {
    if (!userId) return;
    try {
      const key = 'dl_pending_posts';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const buffered = JSON.parse(raw);
      if (!Array.isArray(buffered) || buffered.length === 0) return;
      const mine = buffered.filter(p => {
        const authorId = p?.author?._id || p?.author?.id;
        return authorId === userId;
      });
      if (mine.length > 0) {
        setUserPosts(prev => {
          const ids = new Set(prev.map(p => p._id));
          const toAdd = mine.filter(p => !ids.has(p._id));
          return toAdd.length ? [...toAdd, ...prev] : prev;
        });
      }
      const remaining = buffered.filter(p => {
        const authorId = p?.author?._id || p?.author?.id;
        return authorId !== userId;
      });
      localStorage.setItem(key, JSON.stringify(remaining));
    } catch (error) {
      console.error('Failed to reconcile buffered posts:', error);
    }
    // Only run once when userId is set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Listen for newly created posts globally and prepend to profile posts
  useEffect(() => {
    if (!userId) return;
    
    const handleNewPost = (e) => {
      const post = e?.detail;
      if (!post || !post.author) return;
      const postAuthorId = post.author._id || post.author.id;
      if (postAuthorId === userIdRef.current) {
        setUserPosts(prev => {
          // Check if post already exists to prevent duplicates
          const exists = prev.some(p => p._id === post._id);
          if (exists) return prev;
          return [post, ...prev];
        });
      }
    };
    window.addEventListener('post:created', handleNewPost);
    return () => window.removeEventListener('post:created', handleNewPost);
  }, [userId]);

  // Poll profile posts every 20s to simulate real-time updates
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      fetchUserPosts();
    }, 20000);
    return () => clearInterval(id);
  }, [userId, fetchUserPosts]);

  const handleSave = useCallback(async () => {
    try {
      // Add any remaining input as skills
      const finalSkills = [...editData.skills];
      if (skillsInput.trim()) {
        const newSkills = skillsInput.trim().split(/\s+/).filter(Boolean);
        newSkills.forEach(skill => {
          if (!finalSkills.includes(skill)) {
            finalSkills.push(skill);
          }
        });
      }

      const profileData = {
        username: editData.username,
        bio: editData.bio,
        skills: finalSkills,
        profilePicture: editData.profilePicture
      };

      const result = await updateProfile(profileData);
      if (result.success) {
        setIsEditing(false);
        setSkillsInput('');
        // Only refresh posts if username or profile picture changed
        if (editData.username !== user?.username || editData.profilePicture !== user?.profilePicture) {
          fetchUserPosts();
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }, [editData, skillsInput, updateProfile, user, fetchUserPosts]);

  const handleCancel = useCallback(() => {
    setEditData({
      username: user?.username || '',
      bio: user?.bio || '',
      skills: user?.skills || [],
      profilePicture: user?.profilePicture || ''
    });
    setSkillsInput('');
    setIsEditing(false);
  }, [user]);

  // Handle skills input change
  const handleSkillsInputChange = (e) => {
    const value = e.target.value;
    setSkillsInput(value);

    // Check if user pressed space - add the word before the space as a skill
    if (value.endsWith(' ') && value.trim()) {
      // Get all words from the input
      const words = value.trim().split(/\s+/).filter(Boolean);
      
      // Add each word that's not already in skills
      if (words.length > 0) {
        const newSkills = words.filter(word => !editData.skills.includes(word));
        if (newSkills.length > 0) {
          setEditData(prev => ({
            ...prev,
            skills: [...prev.skills, ...newSkills]
          }));
        }
        // Clear input after adding skills
        setSkillsInput('');
      }
    }
  };

  // Handle skills input keydown
  const handleSkillsKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (skillsInput.trim()) {
        const newSkills = skillsInput.trim().split(/\s+/).filter(skill => 
          skill && !editData.skills.includes(skill)
        );
        if (newSkills.length > 0) {
          setEditData(prev => ({
            ...prev,
            skills: [...prev.skills, ...newSkills]
          }));
          setSkillsInput('');
          setShowSkillSuggestions(false);
        }
      }
    } else if (e.key === 'Backspace' && !skillsInput && editData.skills.length > 0) {
      // Remove last skill on backspace when input is empty
      setEditData(prev => ({
        ...prev,
        skills: prev.skills.slice(0, -1)
      }));
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (skill) => {
    if (!editData.skills.includes(skill)) {
      setEditData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
    setSkillsInput('');
    setShowSkillSuggestions(false);
    if (skillsInputRef.current) {
      skillsInputRef.current.focus();
    }
  };

  // Remove skill
  const handleRemoveSkill = (skillToRemove) => {
    setEditData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  // Handle delete profile
  const handleDeleteProfile = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProfile();
      if (result.success) {
        // Redirect to landing page after successful deletion
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [deleteProfile, navigate]);

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

  // Memoized callbacks for PostCard to prevent unnecessary re-renders
  const handlePostUpdate = useCallback((updatedPost) => {
    setUserPosts(prev => prev.map(p => 
      p._id === updatedPost._id ? updatedPost : p
    ));
  }, []);

  const handlePostDelete = useCallback((postId) => {
    setUserPosts(prev => prev.filter(p => p._id !== postId));
  }, []);

  const handleOpenFollowersModal = useCallback(() => setShowFollowersModal(true), []);
  const handleOpenFollowingModal = useCallback(() => setShowFollowingModal(true), []);
  const handleCloseFollowersModal = useCallback(() => setShowFollowersModal(false), []);
  const handleCloseFollowingModal = useCallback(() => setShowFollowingModal(false), []);
  const handleOpenDeleteConfirm = useCallback(() => setShowDeleteConfirm(true), []);
  const handleCloseDeleteConfirm = useCallback(() => setShowDeleteConfirm(false), []);
  const handleSetEditing = useCallback(() => setIsEditing(true), []);

  if (!user) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <ProfileSkeleton />
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
          {/* Profile Header */}
          <motion.div variants={itemVariants} className={styles.header}>
            <div className={styles.headerContent}>
              {/* Profile Picture */}
              <div className={styles.avatarContainer}>
                <img
                  src={user.profilePicture || 'https://via.placeholder.com/150/6366f1/ffffff?text=DL'}
                  alt={user.username}
                  className={styles.avatar}
                />
                {isEditing && (
                  <div className={styles.avatarOverlay}>
                    <label className={styles.avatarEdit}>
                      <Edit className={styles.avatarEditIcon} />
                      <span className={styles.avatarEditText}>Change</span>
                      <input
                        type="file"
                        accept="image/*"
                        className={styles.avatarEditInput}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditData(prev => ({ ...prev, profilePicture: reader.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className={styles.info}>
                <div className={styles.infoHeader}>
                <div className={styles.infoContent}>
                  <div className={styles.usernameRow}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.username}
                        onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                        className={styles.usernameInput}
                      />
                    ) : (
                      <h1 className={styles.username}>{user.username}</h1>
                    )}
                    {(user.isVerified === true || user.isVerified === 'true') && (
                      <span 
                        className={styles.verifiedBadge} 
                        title="This user is verified"
                        aria-label="This user is verified"
                      >
                        <BadgeCheck className={styles.verifiedIcon} />
                      </span>
                    )}
                  </div>
                    <p className={styles.role}>Full Stack Developer</p>
                  </div>
                  
                  <div className={styles.actions}>
                    {isEditing ? (
                      <>
                        <div className={styles.actionRow}>
                        <button
                          onClick={handleSave}
                          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                        >
                          <Save className={styles.actionIcon} />
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                        >
                          <X className={styles.actionIcon} />
                          Cancel
                        </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSetEditing}
                          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                        >
                          <Edit className={styles.actionIcon} />
                          Edit Profile
                        </button>
                        <button
                          onClick={handleOpenDeleteConfirm}
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          disabled={isDeleting}
                        >
                          <Trash2 className={styles.actionIcon} />
                          {isDeleting ? 'Deleting...' : 'Delete Profile'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className={styles.bio}>
                  {isEditing ? (
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      className={styles.bioTextarea}
                      rows="3"
                      maxLength="500"
                    />
                  ) : (
                    <p className={styles.bioText}>
                      {user.bio || "No bio yet. Click 'Edit Profile' to add one!"}
                    </p>
                  )}
                </div>

                {/* Skills */}
                <div className={styles.skills}>
                  <h3 className={styles.skillsTitle}>
                    <Briefcase className={styles.skillsIcon} />
                    Skills
                  </h3>
                  {isEditing ? (
                    <div className={styles.skillsContainer} ref={skillsContainerRef}>
                      <div className={styles.skillsTagsContainer}>
                        {editData.skills.map((skill, index) => (
                          <span key={index} className={styles.skillTagEditable}>
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className={styles.skillTagRemove}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                        <input
                          ref={skillsInputRef}
                          type="text"
                          value={skillsInput}
                          onChange={handleSkillsInputChange}
                          onKeyDown={handleSkillsKeyDown}
                          onFocus={() => {
                            if (filteredSuggestions.length > 0) {
                              setShowSkillSuggestions(true);
                            }
                          }}
                          placeholder={editData.skills.length === 0 ? "Type skills separated by spaces..." : "Add more skills..."}
                          className={styles.skillsInputInline}
                        />
                      </div>
                      <AnimatePresence>
                        {showSkillSuggestions && filteredSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={styles.skillSuggestions}
                          >
                            {filteredSuggestions.map((skill, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleSuggestionClick(skill)}
                                className={styles.skillSuggestionItem}
                              >
                                {skill}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className={styles.skillsList}>
                      {user.skills && user.skills.length > 0 ? (
                        user.skills.map((skill, index) => (
                          <span
                            key={index}
                            className={styles.skillTag}
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className={styles.skillsEmpty}>No skills added yet</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className={styles.stats}>
                  <button
                    onClick={handleOpenFollowersModal}
                    className={styles.statButton}
                  >
                    <p className={styles.statValue}>{user.followerCount || 0}</p>
                    <p className={styles.statLabel}>Followers</p>
                  </button>
                  <button
                    onClick={handleOpenFollowingModal}
                    className={styles.statButton}
                  >
                    <p className={styles.statValue}>{user.followingCount || 0}</p>
                    <p className={styles.statLabel}>Following</p>
                  </button>
                  <div className={styles.stat}>
                    <p className={styles.statValue}>{userPosts.length}</p>
                    <p className={styles.statLabel}>Posts</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* User Posts */}
          <motion.div variants={itemVariants} className={styles.posts}>
            <div className={styles.postsHeader}>
              <h2 className={styles.postsTitle}>Your Posts</h2>
              <p className={styles.postsSubtitle}>Share your thoughts and code with the community</p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            ) : userPosts.length > 0 ? (
              <div className={styles.postsList}>
                {userPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    currentUser={user}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.postsEmpty}>
                <div className={styles.postsEmptyIcon}>
                  <Edit className={styles.postsEmptyIconSvg} />
                </div>
                <h3 className={styles.postsEmptyTitle}>No posts yet</h3>
                <p className={styles.postsEmptySubtitle}>
                  Start sharing your thoughts and code with the DevLovers community!
                </p>
                <button
                  onClick={() => window.location.href = '/home'}
                  className={styles.postsEmptyButton}
                >
                  Create Your First Post
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Followers Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={handleCloseFollowersModal}
        userId={user._id}
        type="followers"
      />

      {/* Following Modal */}
      <FollowersModal
        isOpen={showFollowingModal}
        onClose={handleCloseFollowingModal}
        userId={user._id}
        type="following"
      />

      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Profile"
          message="Are you sure you want to delete your profile? This action cannot be undone. All your posts, followers, following relationships, messages, and notifications will be permanently deleted."
          onConfirm={handleDeleteProfile}
          onCancel={handleCloseDeleteConfirm}
          confirmText={isDeleting ? "Deleting..." : "Delete Profile"}
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default ProfilePage;







import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navigation from '../components/Navigation';
import PostCard from '../components/PostCard';
import { useAuth } from '../contexts/AuthContext';
import { useFollow } from '../contexts/FollowContext';
import FollowersModal from '../components/FollowersModal';
import styles from '../styles/ProfilePage.module.css';
import { Briefcase, Heart, BadgeCheck } from 'lucide-react';
import axios from 'axios';

const UserProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { isFollowing: isFollowingFromContext, isFollowingUser, toggleFollow, setFollowState } = useFollow();

  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  
  const profileId = profile?._id || id;
  const isFollowing = isFollowingFromContext(profileId);
  const isFollowingLoading = isFollowingUser(profileId);


  useEffect(() => {
    const fetchAll = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Fetch profile and posts separately for better error handling
        let uData = null;
        let posts = [];
        
        try {
          const uRes = await fetch(`/api/users/${id}`, {
            headers: currentUser ? {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            } : {}
          });
          if (uRes.ok) {
            uData = await uRes.json();
            setProfile(uData);
            
            // Initialize follow state in context
            if (currentUser && uData._id) {
              if (uData.isFollowing !== undefined) {
                setFollowState(uData._id, uData.isFollowing);
              } else if (uData.followers) {
                const following = uData.followers.some(follower => {
                  const followerId = typeof follower === 'string' ? follower : (follower?._id || follower?.id);
                  return followerId === (currentUser._id || currentUser.id);
                });
                setFollowState(uData._id, following);
              } else {
                setFollowState(uData._id, false);
              }
            }
          } else {
            throw new Error('Failed to load profile');
          }
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Failed to load profile');
          setLoading(false);
          return;
        }
        
        // Try to fetch posts, but don't fail if posts fail
        try {
          const token = localStorage.getItem('token');
          const pRes = await fetch(`/api/users/${id}/posts?limit=20`, {
            headers: token ? {
              'Authorization': `Bearer ${token}`
            } : {}
          });
          const pJson = await pRes.json().catch(() => ({ posts: [] }));
          const postsFromApi = Array.isArray(pJson?.posts) 
            ? pJson.posts 
            : Array.isArray(pJson?.data) 
              ? pJson.data 
              : [];
          
          // More robust filtering - ensure author exists
          const sanitized = postsFromApi.filter(p => {
            return p && 
                   p._id && 
                   p.author && 
                   (typeof p.author === 'object' ? p.author.username : true);
          });
          
          // Set isFollowing status on post authors based on profile follow state
          const postsWithFollowState = sanitized.map(post => {
            const postAuthorId = post.author?._id || post.author?.id;
            const followState = uData?.isFollowing ?? post.author?.isFollowing ?? false;
            
            // Initialize follow state in context for each post author
            if (postAuthorId && currentUser && postAuthorId !== currentUser._id) {
              setFollowState(postAuthorId, followState);
            }
            
            return {
              ...post,
              author: {
                ...post.author,
                isFollowing: followState
              }
            };
          });
          
          setUserPosts(postsWithFollowState);
        } catch (postsError) {
          console.error('Error fetching posts:', postsError);
          // Don't set error for posts, just set empty array
          setUserPosts([]);
        }
      } catch (e) {
        console.error('Error in fetchAll:', e);
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAll();
  }, [id, currentUser, setFollowState]);

  const handleFollow = async () => {
    if (!profile || !currentUser || profile._id === currentUser._id || !profileId) return;
    
    const result = await toggleFollow(profileId);
    
    if (result.success) {
      // Update profile to reflect new follower count
      const newFollowingState = result.isFollowing;
      setProfile(prev => ({
        ...prev,
        followerCount: newFollowingState 
          ? (prev.followerCount || 0) + (prev.isFollowing === false ? 1 : 0)
          : (prev.isFollowing === true ? Math.max((prev.followerCount || 1) - 1, 0) : (prev.followerCount || 0)),
        isFollowing: newFollowingState
      }));
      
      // Update all posts' author objects to reflect the new follow state
      setUserPosts(prev => prev.map(post => ({
        ...post,
        author: {
          ...post.author,
          isFollowing: newFollowingState
        }
      })));
    }
  };

  // Consume pending posts on mount for this profile
  useEffect(() => {
    if (!profile?._id) return;
    try {
      const key = 'dl_pending_posts';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const buffered = JSON.parse(raw);
      if (!Array.isArray(buffered) || buffered.length === 0) return;
      const theirs = buffered.filter(p => p?.author?._id === profile._id);
      if (theirs.length > 0) {
        setUserPosts(prev => {
          const ids = new Set(prev.map(p => p._id));
          const toAdd = theirs.filter(p => !ids.has(p._id));
          return toAdd.length ? [...toAdd, ...prev] : prev;
        });
      }
      const remaining = buffered.filter(p => p?.author?._id !== profile._id);
      localStorage.setItem(key, JSON.stringify(remaining));
    } catch {}
  }, [profile]);

  // Listen for globally created posts and prepend when viewing this profile
  useEffect(() => {
    const handleNewPost = (e) => {
      const post = e?.detail;
      if (!post || !post.author || !profile?._id) return;
      if (post.author._id === profile._id) {
        setUserPosts(prev => [post, ...prev]);
      }
    };
    window.addEventListener('post:created', handleNewPost);
    return () => window.removeEventListener('post:created', handleNewPost);
  }, [profile]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <Navigation />
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-red-500">{error || 'Profile not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation />
      <div className={styles.content}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className={styles.grid}>
          {/* Header */}
          <motion.div variants={itemVariants} className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.avatarContainer}>
                <img
                  src={profile.profilePicture || 'https://via.placeholder.com/150/6366f1/ffffff?text=DL'}
                  alt={profile.username}
                  className={styles.avatar}
                />
              </div>
              <div className={styles.info}>
                <div className={styles.infoHeader}>
                  <div className={styles.infoContent}>
                    <div className={styles.usernameRow}>
                      <h1 className={styles.username}>{profile.username}</h1>
                      {(profile.isVerified === true || profile.isVerified === 'true') && (
                        <span className={styles.verifiedBadge} title="This user is verified">
                          <BadgeCheck className={styles.verifiedIcon} />
                        </span>
                      )}
                    </div>
                    <p className={styles.role}>Full Stack Developer</p>
                  </div>
                </div>
                <div className={styles.bio}>
                  <p className={styles.bioText}>{profile.bio || 'No bio yet.'}</p>
                </div>
                <div className={styles.skills}>
                  <h3 className={styles.skillsTitle}>
                    <Briefcase className={styles.skillsIcon} />
                    Skills
                  </h3>
                  <div className={styles.skillsList}>
                    {Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                      profile.skills.map((skill, i) => (
                        <span key={i} className={styles.skillTag}>{skill}</span>
                      ))
                    ) : (
                      <p className={styles.skillsEmpty}>No skills listed</p>
                    )}
                  </div>
                </div>
                <div className={styles.stats}>
                  <button
                    onClick={() => setShowFollowersModal(true)}
                    className={styles.statButton}
                  >
                    <p className={styles.statValue}>{profile.followerCount || profile.followers?.length || 0}</p>
                    <p className={styles.statLabel}>Followers</p>
                  </button>
                  <button
                    onClick={() => setShowFollowingModal(true)}
                    className={styles.statButton}
                  >
                    <p className={styles.statValue}>{profile.followingCount || profile.following?.length || 0}</p>
                    <p className={styles.statLabel}>Following</p>
                  </button>
                  <div className={styles.stat}>
                    <p className={styles.statValue}>{userPosts.length}</p>
                    <p className={styles.statLabel}>Posts</p>
                  </div>
                </div>
                
                {/* Follow Button */}
                {currentUser && profileId && profileId !== currentUser._id && (
                  <div className={styles.matchSection}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleFollow}
                      disabled={isFollowingLoading}
                      className={`${styles.matchButton} ${isFollowing ? styles.matchButtonMatched : styles.matchButtonUnmatched}`}
                    >
                      <Heart className={styles.matchIcon} fill={isFollowing ? 'currentColor' : 'none'} />
                      <span>{isFollowing ? 'Following' : 'Follow'}</span>
                    </motion.button>
                    {profile.isMutualFollow && (
                      <p className={styles.mutualFollowText}>You follow each other</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Posts */}
          <motion.div variants={itemVariants} className={styles.posts}>
            <div className={styles.postsHeader}>
              <h2 className={styles.postsTitle}>Posts by {profile.username}</h2>
            </div>
            {userPosts.length > 0 ? (
              <div className={styles.postsList}>
                {userPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    currentUser={currentUser}
                    onUpdate={(updatedPost) => {
                      setUserPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
                    }}
                    onDelete={(postId) => {
                      setUserPosts(prev => prev.filter(p => p._id !== postId));
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.postsEmpty}>
                <h3 className={styles.postsEmptyTitle}>No posts yet</h3>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Followers Modal */}
      {profile && (
        <>
          <FollowersModal
            isOpen={showFollowersModal}
            onClose={() => setShowFollowersModal(false)}
            userId={profile._id}
            type="followers"
          />

          {/* Following Modal */}
          <FollowersModal
            isOpen={showFollowingModal}
            onClose={() => setShowFollowingModal(false)}
            userId={profile._id}
            type="following"
          />
        </>
      )}
    </div>
  );
};

export default UserProfilePage;





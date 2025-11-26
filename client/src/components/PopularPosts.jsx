import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, ArrowRight, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PopularPostsSkeleton } from './SkeletonComponents';
import styles from '../styles/PopularPosts.module.css';

const PopularPosts = ({ posts, loading = false }) => {
  const navigate = useNavigate();
  // Function to get default profile picture based on gender
  const getDefaultProfilePicture = (user) => {
    if (!user) return 'https://via.placeholder.com/32/6366f1/ffffff?text=DL';
    
    const gender = user.gender;
    if (gender === 'male') {
      return 'https://via.placeholder.com/32/3b82f6/ffffff?text=👨';
    } else if (gender === 'female') {
      return 'https://via.placeholder.com/32/ec4899/ffffff?text=👩';
    } else {
      return 'https://via.placeholder.com/32/6366f1/ffffff?text=👤';
    }
  };

  // Show skeleton loading
  if (loading) {
    return <PopularPostsSkeleton />;
  }

  if (!posts || posts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Flame className={styles.emptyIconSvg} />
          </div>
          <p className={styles.emptyTitle}>No trending posts yet</p>
          <p className={styles.emptySubtitle}>Be the first to create engaging content!</p>
        </div>
      </div>
    );
  }

  return (
          <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <Flame className={styles.headerIconSvg} />
          </div>
          <div className={styles.headerText}>
            <h3 className={styles.headerTitle}>🔥 Hot Posts</h3>
            <p className={styles.headerSubtitle}>Trending now</p>
          </div>
        </div>
        <div className={styles.headerAction}>
          <ArrowRight className={styles.headerActionIcon} />
        </div>
      </div>

      <div className={styles.list}>
        {posts.map((post, index) => (
          <motion.div
            key={post._id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={styles.item}
          >
            {/* Post Header */}
            <div className={styles.itemHeader}>
              <div className={styles.itemRank}>
                {index + 1}
              </div>
              <img
                src={post.author.profilePicture || getDefaultProfilePicture(post.author)}
                alt={post.author.username}
                className={styles.itemAvatar}
                onError={(e) => {
                  e.target.src = getDefaultProfilePicture(post.author);
                }}
                onClick={() => navigate(`/users/${post.author._id}`)}
                style={{ cursor: 'pointer' }}
              />
              <div className={styles.itemInfo}>
                <button
                  className={styles.itemAuthor}
                  onClick={() => navigate(`/users/${post.author._id}`)}
                  style={{ textAlign: 'left' }}
                >
                  {post.author.username}
                </button>
                <p className={styles.itemTimestamp}>
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Post Content */}
            <div className={styles.itemContent}>
              <p className={styles.itemText}>
                {post.content}
              </p>
            </div>

            {/* Post Stats */}
            <div className={styles.itemStats}>
              <div className={styles.itemLikes}>
                <Heart className={styles.itemLikesIcon} />
                <span>{post.likeCount || post.likes?.length || 0}</span>
              </div>
              <div className={styles.itemComments}>
                <MessageCircle className={styles.itemCommentsIcon} />
                <span>{post.commentCount || post.comments?.length || 0}</span>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className={styles.itemTags}>
                {post.tags.slice(0, 3).map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className={styles.itemTag}
                  >
                    {tag}
                  </span>
                ))}
                {post.tags.length > 3 && (
                  <span className={styles.itemTagMore}>
                    +{post.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerContent}>
          <button className={styles.footerButton}>
            🚀 Explore All Trending
          </button>
          <p className={styles.footerNote}>
            Posts are ranked by engagement and recency
          </p>
        </div>
      </div>
    </div>
  );
};

export default PopularPosts;




import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFollow } from '../contexts/FollowContext';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import getSocket from '../socket';
import { 
  Heart, 
  MessageCircle, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Send,
  Tag,
  UserPlus,
  BadgeCheck
} from 'lucide-react';
import React from 'react'; // Added missing import
// Removed unused Skeleton import
import styles from '../styles/PostCard.module.css';

const PostCard = ({ post, currentUser, onUpdate, onDelete, getDefaultProfilePicture }) => {
  const { isFollowing: isFollowingFromContext, isFollowingUser, toggleFollow, setFollowState } = useFollow();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showCommentPlaceholder, setShowCommentPlaceholder] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsRef = React.useRef(null);
  const [localComments, setLocalComments] = useState(post.comments || []);
  const [localLikes, setLocalLikes] = useState(post.likes || []);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount || post.likes?.length || 0);
  const [commentLikes, setCommentLikes] = useState(() => {
    // Initialize comment likes state from post.comments
    const likesMap = {};
    if (post.comments && Array.isArray(post.comments)) {
      post.comments.forEach(comment => {
        if (comment._id && comment.likes) {
          likesMap[comment._id] = comment.likes || [];
        }
      });
    }
    return likesMap;
  });
  
  const authorId = post.author?._id || post.author?.id;
  const isFollowing = isFollowingFromContext(authorId);
  const isFollowingLoading = isFollowingUser(authorId);
  
  const navigate = useNavigate();
  // Code-post run state
  const isCodePost = post?.type === 'code' && post?.code && post?.code?.language && post?.code?.sourceCode;
  const featureCodeRunner = import.meta.env.VITE_FEATURE_CODE_RUNNER === 'true';
  const [runView, setRunView] = useState('code'); // 'code' | 'output'
  const [running, setRunning] = useState(false);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState(null);
  const [timeMs, setTimeMs] = useState(null);
  const [stdinVal, setStdinVal] = useState(post?.code?.stdin || '');

  const runCode = async () => {
    if (!isCodePost || running) return;
    if (!featureCodeRunner) return;
    setRunning(true);
    setStdout('');
    setStderr('');
    setExitCode(null);
    setTimeMs(null);
    try {
      const resp = await axios.post('/api/runner/compile-run', {
        language: post.code.language,
        sourceCode: post.code.sourceCode,
        stdin: stdinVal
      });
      const data = resp?.data || {};
      setStdout(data.stdout || '');
      setStderr(data.stderr || '');
      setExitCode(typeof data.exitCode === 'number' ? data.exitCode : null);
      setTimeMs(typeof data.timeMs === 'number' ? data.timeMs : null);
      setRunView('output');
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Run failed';
      setStderr(String(msg));
      setRunView('output');
    } finally {
      setRunning(false);
    }
  };



  // Function to get default profile picture based on gender (fallback if not provided)
  const getDefaultProfilePictureFallback = (user) => {
    if (getDefaultProfilePicture) return getDefaultProfilePicture(user);
    
    if (!user) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiM2MzY2ZjEiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOS4zMzEzMyAxNCA0IDE1LjMzMTMgNCAxOFYyMEgyMFYxOEMyMCAxNS4zMzEzIDE0LjY2ODcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
    
    const gender = user.gender;
    if (gender === 'male') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiMzYjgyZjYiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOS4zMzEzMyAxNCA0IDE1LjMzMTMgNCAxOFYyMEgyMFYxOEMyMCAxNS4zMzEzIDE0LjY2ODcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
    } else if (gender === 'female') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiNlYzQ4OTkiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOS4zMzEzMyAxNCA0IDE1LjMzMTMgNCAxOFYyMEgyMFYxOEMyMCAxNS4zMzEzIDE0LjY2ODcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
    } else {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiM2MzY2ZjEiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOS4zMzEzMyAxNCA0IDE1LjMzMTMgNCAxOFYyMEgyMFYxOEMyMCAxNS4zMzEzIDE0LjY2ODcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
    }
  };

  const currentUserId = currentUser?._id || currentUser?.id;
  const isAuthor = currentUserId && authorId && currentUserId === authorId;
  const isLiked = currentUserId && Array.isArray(localLikes) && localLikes.some((like) => {
    const likeId = typeof like === 'string' ? like : (like?._id || like?.id);
    // Convert both to strings for comparison to handle ObjectId vs string mismatch
    return String(likeId) === String(currentUserId);
  });
  const likeCount = localLikeCount;
  const commentCount = localComments.length;

  const handleLike = async () => {
    if (!currentUser) {
      // Redirect to login or show message
      navigate('/');
      return;
    }

    try {
      // Optimistic update
      const newLikes = isLiked 
        ? (localLikes || []).filter((like) => {
            const likeId = typeof like === 'string' ? like : (like?._id || like?.id);
            // Convert both to strings for comparison
            return String(likeId) !== String(currentUserId);
          })
        : [...(localLikes || []), currentUserId];
      
      setLocalLikes(newLikes);
      setLocalLikeCount(newLikes.length);

      // Ensure token is included
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/posts/${post._id}/like`, {}, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });

      if (response && response.data) {
        const data = response.data;
        // API returns likes as array of ObjectIds (strings)
        // Update local state with the response data
        setLocalLikes(data.likes || []);
        setLocalLikeCount(data.likeCount || 0);
        
        // Update parent component after state update (use setTimeout to avoid render warning)
        setTimeout(() => {
          onUpdate({
            ...post,
            likes: data.likes,
            likeCount: data.likeCount
          });
        }, 0);
      } else {
        // Revert on error
        setLocalLikes(post.likes || []);
        setLocalLikeCount(post.likeCount || post.likes?.length || 0);
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on error
      setLocalLikes(post.likes || []);
      setLocalLikeCount(post.likeCount || post.likes?.length || 0);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !authorId || authorId === currentUser._id) return;
    
    const result = await toggleFollow(authorId);
    
    // Update post author's isFollowing status if we have the post object
    if (result.success && post.author) {
      post.author.isFollowing = result.isFollowing;
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const commentText = newComment.trim();
    try {
      // Optimistic update
      const tempComment = {
        _id: tempId,
        text: commentText,
        user: currentUser,
        likes: [], // Initialize likes array for new comment
        createdAt: new Date().toISOString()
      };

      // Build the new comments array consistently and use it both locally and for the parent update
      const withTemp = [...(localComments || []), tempComment];
      setLocalComments(withTemp);
      setNewComment('');
      setShowCommentPlaceholder(false);

      const response = await axios.post(`/api/posts/${post._id}/comment`, { text: commentText });

      if (response.data && response.data.comment) {
        const real = response.data.comment;
        const replaced = withTemp.map(c => (c._id === tempId ? real : c));
        setLocalComments(replaced);

        // Update comment likes state for the new comment
        if (real._id && real.likes) {
          setCommentLikes(prev => ({
            ...prev,
            [real._id]: real.likes || []
          }));
        }

        // Update parent component with the exact same comments array (use setTimeout to avoid render warning)
        setTimeout(() => {
          onUpdate({
            ...post,
            comments: replaced
          });
        }, 0);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Remove temp comment on error
      setLocalComments(prev => prev.filter(c => c._id !== tempId));
      // Restore comment text into input
      setNewComment(commentText);
      setShowCommentPlaceholder(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sync comment likes when comments change
  useEffect(() => {
    if (localComments && Array.isArray(localComments)) {
      const likesMap = {};
      localComments.forEach(comment => {
        if (comment._id) {
          // Use comment.likes if available, otherwise keep existing state
          likesMap[comment._id] = comment.likes || commentLikes[comment._id] || [];
        }
      });
      setCommentLikes(prev => ({ ...prev, ...likesMap }));
    }
  }, [localComments]);

  // Sync comment likes when post prop changes
  useEffect(() => {
    if (post.comments && Array.isArray(post.comments)) {
      const likesMap = {};
      post.comments.forEach(comment => {
        if (comment._id && comment.likes) {
          likesMap[comment._id] = Array.isArray(comment.likes) ? comment.likes : [];
        }
      });
      if (Object.keys(likesMap).length > 0) {
        setCommentLikes(prev => ({ ...prev, ...likesMap }));
      }
    }
  }, [post.comments]);

  // Socket ref for cleanup
  const socketRef = useRef(null);

  // Listen for real-time post like updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;

    const handlePostLiked = (data) => {
      // Only update if this is for the current post
      if (data._id && String(data._id) === String(post._id)) {
        // Update local likes state
        if (data.likes !== undefined) {
          setLocalLikes(Array.isArray(data.likes) ? data.likes : []);
        }
        if (data.likeCount !== undefined) {
          setLocalLikeCount(data.likeCount);
        }

        // Update parent component after state update (use setTimeout to avoid render warning)
        setTimeout(() => {
          if (onUpdate) {
            onUpdate({
              ...post,
              likes: Array.isArray(data.likes) ? data.likes : post.likes,
              likeCount: data.likeCount !== undefined ? data.likeCount : post.likeCount
            });
          }
        }, 0);
      }
    };

    socket.on('post:liked', handlePostLiked);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('post:liked', handlePostLiked);
      }
    };
  }, [post._id, onUpdate, post]);

  // Listen for real-time comment like updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;

    const handleCommentLiked = (data) => {
      // Only update if this is for the current post
      if (data.postId && String(data.postId) === String(post._id)) {
        if (data.commentId && data.likes !== undefined) {
          // Update comment likes state
          setCommentLikes(prev => ({
            ...prev,
            [data.commentId]: Array.isArray(data.likes) ? data.likes : []
          }));

          // Update local comments and prepare updated comments for parent
          let updatedComments;
          setLocalComments(prev => {
            updatedComments = prev.map(comment => {
              if (String(comment._id) === String(data.commentId)) {
                return { ...comment, likes: Array.isArray(data.likes) ? data.likes : [] };
              }
              return comment;
            });

            return updatedComments;
          });
          
          // Update parent component after state update (use setTimeout to avoid render warning)
          setTimeout(() => {
            if (onUpdate && updatedComments) {
              onUpdate({
                ...post,
                comments: updatedComments
              });
            }
          }, 0);
        }
      }
    };

    socket.on('comment:liked', handleCommentLiked);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('comment:liked', handleCommentLiked);
      }
    };
  }, [post._id, onUpdate, post]);

  // Handle comment like/unlike
  const handleCommentLike = async (commentId) => {
    if (!currentUser || !commentId) return;

    try {
      // Find the comment to check current like status
      const comment = localComments.find(c => c._id === commentId);
      if (!comment) return;

      const currentLikes = commentLikes[commentId] || comment.likes || [];
      const isLiked = currentLikes.some(
        likeId => String(likeId) === String(currentUser._id) || String(likeId?._id) === String(currentUser._id)
      );

      // Optimistic update - store original likes for rollback
      const originalLikes = [...currentLikes];
      const updatedLikes = isLiked
        ? currentLikes.filter(likeId => String(likeId) !== String(currentUser._id) && String(likeId?._id) !== String(currentUser._id))
        : [...currentLikes, currentUser._id];

      // Update state optimistically
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: updatedLikes
      }));

      // Update local comments
      setLocalComments(prev => prev.map(c => {
        if (c._id === commentId) {
          return { ...c, likes: updatedLikes };
        }
        return c;
      }));

      // Make API call
      const response = await axios.post(`/api/posts/${post._id}/comment/${commentId}/like`);

      // Update with server response (which has the actual likes array)
      if (response.data && response.data.likes) {
        setCommentLikes(prev => ({
          ...prev,
          [commentId]: response.data.likes
        }));

        // Compute updated comments and update state
        let updatedComments;
        setLocalComments(prev => {
          updatedComments = prev.map(c => {
            if (c._id === commentId) {
              return { ...c, likes: response.data.likes };
            }
            return c;
          });
          return updatedComments;
        });

        // Update parent component (use setTimeout to avoid render warning)
        if (onUpdate && updatedComments) {
          setTimeout(() => {
            onUpdate({
              ...post,
              comments: updatedComments
            });
          }, 0);
        }
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert optimistic update on error
      const comment = localComments.find(c => c._id === commentId);
      if (comment) {
        const originalLikes = comment.likes || [];
        setCommentLikes(prev => ({
          ...prev,
          [commentId]: originalLikes
        }));
        setLocalComments(prev => prev.map(c => {
          if (c._id === commentId) {
            return { ...c, likes: originalLikes };
          }
          return c;
        }));
      }
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    try {
      const response = await axios.put(`/api/posts/${post._id}`, {
        content: editContent.trim()
      });
      const data = response.data;
      // Update parent component after state update (use setTimeout to avoid render warning)
      setTimeout(() => {
        onUpdate(data.post);
      }, 0);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/posts/${post._id}`);
      onDelete(post._id);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(post.content);
  };

  // Update local state when post prop changes
  useEffect(() => {
    setLocalComments(post.comments || []);
    setLocalLikes(post.likes || []);
    setLocalLikeCount(post.likeCount || post.likes?.length || 0);
    
    // Initialize follow state from post data if available
    // setFollowState will only set if the state doesn't already exist in context
    // This preserves the state when user follows/unfollows from profile page
    const authorId = post.author?._id || post.author?.id;
    if (authorId && currentUser && authorId !== currentUser._id) {
      if (post?.author?.isFollowing !== undefined) {
        // Use isFollowing from API if provided
        setFollowState(authorId, post.author.isFollowing);
      } else if (post?.author?.followers) {
        // Fallback: check followers array if API didn't provide isFollowing
        const following = post.author.followers.some(follower => {
          const followerId = typeof follower === 'object' ? follower._id || follower.id : follower;
          return followerId === (currentUser._id || currentUser.id);
        });
        setFollowState(authorId, following);
      }
    }
  }, [post, currentUser, setFollowState]);

  // Close actions menu on outside click or Escape
  React.useEffect(() => {
    if (!showActionsMenu) return;
    
    const onDocClick = (e) => {
      // Check if click is outside both the actions container and the dropdown
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    const onEsc = (e) => { if (e.key === 'Escape') setShowActionsMenu(false); };
    
    // Use a small delay to allow mouse movement from button to dropdown
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', onDocClick, true);
    }, 100);
    
    document.addEventListener('keydown', onEsc);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showActionsMenu]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={styles.container}
    >
      {/* Post Header */}
      <div className={styles.header}>
        <div className={styles.author}>
          <img
            src={(post.author && post.author.profilePicture) || getDefaultProfilePictureFallback(post.author)}
            alt={(post.author && post.author.username) || 'User'}
            className={styles.authorImage}
            onError={(e) => {
              e.target.src = getDefaultProfilePictureFallback(post.author);
            }}
            onClick={() => navigate(authorId === currentUserId ? '/profile' : `/users/${authorId}`)}
            style={{ cursor: 'pointer' }}
          />
          <div className={styles.authorInfo}>
            <div className={styles.authorNameRow}>
              <button
                className={styles.authorName}
                onClick={() => navigate(authorId === currentUserId ? '/profile' : `/users/${authorId}`)}
                style={{ textAlign: 'left' }}
              >
                {(post.author && post.author.username) || 'Unknown'}
              </button>
              {(post.author?.isVerified === true || post.author?.isVerified === 'true') && (
                <span className={styles.verifiedBadge} title="This user is verified">
                  <BadgeCheck className={styles.verifiedIcon} />
                </span>
              )}
            </div>
            <p className={styles.timestamp}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              {post.isEdited && ' (edited)'}
            </p>
          </div>
        </div>

        {isAuthor && (
          <div 
            className={styles.actions} 
            ref={actionsRef}
            onMouseEnter={() => {
              // Keep menu open when hovering over actions container
              if (showActionsMenu) return;
            }}
            onMouseLeave={(e) => {
              // Only close if mouse leaves the entire actions container (including dropdown)
              // Check if we're moving to a child element
              const relatedTarget = e.relatedTarget;
              if (actionsRef.current && relatedTarget && actionsRef.current.contains(relatedTarget)) {
                return; // Mouse is still within the container
              }
              // Small delay to allow smooth mouse movement
              setTimeout(() => {
                if (actionsRef.current && !actionsRef.current.matches(':hover')) {
                  setShowActionsMenu(false);
                }
              }, 150);
            }}
          >
            <button
              className={styles.moreButton}
              aria-expanded={showActionsMenu}
              onClick={(e) => {
                e.stopPropagation();
                setShowActionsMenu(s => !s);
              }}
            >
              <MoreVertical className={styles.moreIcon} />
            </button>
            {showActionsMenu && (
              <div 
                className={styles.dropdown}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  // Keep menu open when hovering over dropdown
                }}
              >
                <button
                  onClick={() => { setIsEditing(true); setShowActionsMenu(false); }}
                  className={styles.dropdownButton}
                >
                  <Edit className={styles.dropdownIcon} />
                  Edit
                </button>
                <button
                  onClick={() => { handleDelete(); setShowActionsMenu(false); }}
                  className={styles.dropdownButtonDestructive}
                >
                  <Trash2 className={styles.dropdownIcon} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      {isEditing ? (
        <div className={styles.editForm}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={styles.editTextarea}
            rows="3"
            maxLength="1000"
          />
          <div className={styles.editButtons}>
            <button
              onClick={handleEdit}
              className={styles.editSave}
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className={styles.editCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.content}>
          <p className={styles.text}>{post.content}</p>

          {/* Code Post Renderer */}
          {isCodePost && (
            <div className={styles.codePost}>
              {featureCodeRunner ? (
                <>
                  {/* Toolbar */}
                  <div className={styles.codeToolbar}>
                    <div className={styles.langBadge}>{post.code.language === 'cpp' ? 'C++' : 'Java'}</div>
                    <div className={styles.toolbarButtons}>
                      <button
                        className={styles.toolbarButton}
                        onClick={() => setRunView('code')}
                        disabled={runView === 'code'}
                      >
                        Code
                      </button>
                      <button
                        className={styles.toolbarButton}
                        onClick={() => setRunView('output')}
                        disabled={runView === 'output'}
                      >
                        Output
                      </button>
                      <button
                        className={styles.runButton}
                        onClick={runCode}
                        disabled={running}
                        title="Run code"
                      >
                        {running ? 'Running…' : 'Run'}
                      </button>
                    </div>
                  </div>

                  {/* Optional stdin input */}
                  <div className={styles.stdinWrap}>
                    <label className={styles.stdinLabel}>Input (stdin)</label>
                    <textarea
                      className={styles.stdinTextarea}
                      rows="3"
                      value={stdinVal}
                      onChange={(e) => setStdinVal(e.target.value)}
                      placeholder="Provide input for the program (optional)"
                    />
                  </div>

                  {runView === 'code' ? (
                    <pre className={styles.codeBlock}>
{post.code.sourceCode}
                    </pre>
                  ) : (
                    <div className={styles.outputPanel}>
                      {timeMs !== null && (
                        <div className={styles.runMeta}>Exit {exitCode ?? '-'} • {timeMs} ms</div>
                      )}
                      {stdout && (
                        <div className={styles.stdoutBox}>
                          <div className={styles.outputLabel}>stdout</div>
                          <pre className={styles.outputPre}>{stdout}</pre>
                        </div>
                      )}
                      {stderr && (
                        <div className={styles.stderrBox}>
                          <div className={styles.outputLabel}>stderr</div>
                          <pre className={styles.outputPre}>{stderr}</pre>
                        </div>
                      )}
                      {!stdout && !stderr && (
                        <div className={styles.noOutput}>No output</div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                // Runner disabled: show code only
                <pre className={styles.codeBlock}>
{post.code.sourceCode}
                </pre>
              )}
            </div>
          )}

          {post.image && (
            <div className={styles.imageContainer}>
              <img
                src={post.image}
                alt="Post"
                className={styles.image}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className={styles.tag}
                >
                  <Tag className={styles.tagIcon} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className={styles.actionsBar}>
        <button
          onClick={handleLike}
          disabled={!currentUser}
          className={`${styles.likeButton} ${
            isLiked
              ? styles.likeButtonActive
              : styles.likeButtonInactive
          }`}
          title={!currentUser ? 'Please log in to like posts' : ''}
        >
          <Heart className={`${styles.likeIcon} ${isLiked ? styles.likeIconFilled : ''}`} fill={isLiked ? 'currentColor' : 'none'} />
          <span className={styles.likeCount}>{likeCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={styles.commentButton}
        >
          <MessageCircle className={styles.commentIcon} />
          <span className={styles.commentCount}>{commentCount}</span>
        </button>

        {/* Follow Button */}
        {currentUser && authorId && authorId !== currentUser._id && (
          <button
            onClick={handleFollow}
            disabled={isFollowingLoading}
            className={`${styles.matchButton} ${
              isFollowing ? styles.matchButtonMatched : styles.matchButtonUnmatched
            }`}
          >
            <UserPlus className={styles.matchIcon} fill={isFollowing ? 'currentColor' : 'none'} />
            <span>{isFollowing ? 'Following' : 'Follow'}</span>
          </button>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className={styles.commentsSection}
        >
          <h4 className={styles.commentsTitle}>Comments</h4>
          
          {/* Comment Form */}
          <form onSubmit={handleComment} className={styles.commentForm}>
            <div className={styles.commentFormContent}>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={showCommentPlaceholder ? "Add a comment..." : ""}
                onFocus={() => setShowCommentPlaceholder(false)}
                onBlur={() => setShowCommentPlaceholder(true)}
                className={styles.commentInput}
                maxLength="500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className={styles.commentSubmit}
              >
                {isSubmitting ? (
                  <div className="loading loading-spinner loading-xs"></div>
                ) : (
                  <Send className={styles.commentSubmitIcon} />
                )}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className={styles.commentsList}>
            {localComments.map((comment) => (
              <motion.div
                key={comment._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={styles.comment}
              >
                <img
                  src={comment.user.profilePicture || getDefaultProfilePictureFallback(comment.user)}
                  alt={comment.user.username}
                  className={styles.commentAvatar}
                  onError={(e) => {
                    e.target.src = getDefaultProfilePictureFallback(comment.user);
                  }}
                />
                <div className={styles.commentContent}>
                  <div className={styles.commentBubble}>
                    <p className={styles.commentAuthor}>
                      {comment.user.username}
                    </p>
                    <p className={styles.commentText}>{comment.text}</p>
                  </div>
                  <div className={styles.commentActions}>
                    <p className={styles.commentTimestamp}>
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </p>
                    {(() => {
                      const commentLikesList = commentLikes[comment._id] || comment.likes || [];
                      const likeCount = Array.isArray(commentLikesList) ? commentLikesList.length : 0;
                      const isLiked = currentUser && commentLikesList.some(
                        likeId => String(likeId) === String(currentUser._id) || String(likeId?._id) === String(currentUser._id)
                      );
                      
                      return (
                        <>
                          {currentUser && (
                            <button
                              onClick={() => handleCommentLike(comment._id)}
                              className={`${styles.commentLikeButton} ${isLiked ? styles.commentLikeButtonActive : ''}`}
                              title={isLiked ? 'Unlike' : 'Like'}
                            >
                              <Heart 
                                className={styles.commentLikeIcon} 
                                size={12} 
                                fill={isLiked ? 'currentColor' : 'none'} 
                              />
                            </button>
                          )}
                          {likeCount > 0 && (
                            <span className={styles.commentLikeCount}>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PostCard;




import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFollow } from '../contexts/FollowContext';
import Navigation from '../components/Navigation';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import PopularPosts from '../components/PopularPosts';
import { PostCardSkeleton, PopularPostsSkeleton, CreatePostSkeleton } from '../components/SkeletonComponents';
import { MessageCircle, Users, Zap, TrendingUp, RefreshCw } from 'lucide-react';
import axios from 'axios';
import getSocket from '../socket';
import styles from '../styles/MainPage.module.css';

const MainPage = () => {
  const [posts, setPosts] = useState([]);
  const [popularPosts, setPopularPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrending, setShowTrending] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);
  const postsRef = useRef(posts);
  
  const { user, loading: authLoading } = useAuth();
  const { setFollowStates } = useFollow();
  const navigate = useNavigate();

  // Rehydrate UI state from localStorage before initial fetch
  useEffect(() => {
    try {
      const cachedShowTrending = localStorage.getItem('dl_feed_showTrending');
      if (cachedShowTrending === 'true' || cachedShowTrending === 'false') {
        setShowTrending(cachedShowTrending === 'true');
      }
      const cachedPage = parseInt(localStorage.getItem('dl_feed_currentPage') || '1', 10);
      if (!Number.isNaN(cachedPage) && cachedPage > 0) {
        setCurrentPage(cachedPage);
      }
      const cachedPostsRaw = localStorage.getItem('dl_feed_cache');
      if (cachedPostsRaw) {
        const cachedPosts = JSON.parse(cachedPostsRaw);
        if (Array.isArray(cachedPosts) && cachedPosts.length > 0) {
          setPosts(cachedPosts);
          setLoading(false);
        }
      }
      const cachedPopularRaw = localStorage.getItem('dl_popular_cache');
      if (cachedPopularRaw) {
        const cachedPopular = JSON.parse(cachedPopularRaw);
        if (Array.isArray(cachedPopular)) setPopularPosts(cachedPopular);
      }
    } catch {}
  }, []);

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

  useEffect(() => {
    if (user && !authLoading) {
      // Only fetch if we don't have cached posts or cache is older than 30 seconds
      const cachedTime = localStorage.getItem('dl_feed_cache_time');
      const now = Date.now();
      const cacheAge = cachedTime ? now - parseInt(cachedTime, 10) : Infinity;
      const CACHE_MAX_AGE = 30000; // 30 seconds
      
      if (cacheAge > CACHE_MAX_AGE || posts.length === 0) {
        console.log('User authenticated, fetching posts...');
        fetchPosts();
        fetchPopularPosts();
      } else {
        console.log('Using cached posts, skipping fetch');
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  // Realtime updates via Socket.IO
  useEffect(() => {
    if (!user || authLoading) return;
    const socket = getSocket();

    // Also listen for local window events dispatched by CreatePost so the feed updates
    // immediately in the same tab without relying only on sockets.
    const onLocalPostCreated = (e) => {
      try {
        handleNewPost(e.detail);
      } catch (err) {
        // no-op
      }
    };
    window.addEventListener('post:created', onLocalPostCreated);

    const onPostCreated = (newPost) => {
      try {
        handleNewPost(newPost);
      } catch (e) {
        // no-op
      }
    };
    const onPostUpdated = (updatedPost) => {
      handlePostUpdate(updatedPost);
    };
    const onPostDeleted = ({ _id }) => {
      handlePostDelete(_id);
    };
    const onPostLiked = ({ _id, likes, likeCount }) => {
      setPosts(prev => prev.map(p => p._id === _id ? { ...p, likes, likeCount } : p));
    };
    const onPostCommented = ({ _id, comment }) => {
      setPosts(prev => prev.map(p => p._id === _id ? { ...p, comments: [...(p.comments || []), comment] } : p));
    };

    socket.on('post:created', onPostCreated);
    socket.on('post:updated', onPostUpdated);
    socket.on('post:deleted', onPostDeleted);
    socket.on('post:liked', onPostLiked);
    socket.on('post:commented', onPostCommented);

    // Also refresh trending on impactful events
    const refreshTrending = () => fetchPopularPosts();
    socket.on('post:created', refreshTrending);
    socket.on('post:updated', refreshTrending);
    socket.on('post:deleted', refreshTrending);
    socket.on('post:liked', refreshTrending);
    socket.on('post:commented', refreshTrending);

    return () => {
      socket.off('post:created', onPostCreated);
      socket.off('post:updated', onPostUpdated);
      socket.off('post:deleted', onPostDeleted);
      socket.off('post:liked', onPostLiked);
      socket.off('post:commented', onPostCommented);
      socket.off('post:created', refreshTrending);
      socket.off('post:updated', refreshTrending);
      socket.off('post:deleted', refreshTrending);
      socket.off('post:liked', refreshTrending);
      socket.off('post:commented', refreshTrending);
      window.removeEventListener('post:created', onLocalPostCreated);
    };
  }, [user, authLoading, setFollowStates]);

  const fetchPosts = async (page = 1, retryCount = 0, isRefresh = false) => {
    const maxRetries = 2;
    
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(page === 1);
      }
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/posts?page=${page}&limit=10`, {
        timeout: 30000, // Increased to 30 second timeout
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        // Add retry configuration
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      
      // Handle non-2xx responses gracefully
      if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        if (page === 1 && posts.length === 0) {
          setError('Unable to load posts. Please refresh the page.');
        }
        setLoading(false);
        return;
      }
      
      const data = response?.data || {};
      const postsFromApi = Array.isArray(data.posts)
        ? data.posts
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : [];
      
      // More robust filtering - ensure author exists and is not null
      const sanitized = postsFromApi.filter(p => {
        return p && 
               p._id && 
               p.author && 
               (typeof p.author === 'object' ? p.author.username : true);
      });
      
      // Ensure isFollowing status is preserved and initialize in context
      const followStatesMap = {};
      const postsWithFollowState = sanitized.map(p => {
        const authorId = p.author?._id || p.author?.id;
        const followState = p.author?.isFollowing ?? false;
        
        // Collect follow states to initialize in context
        if (authorId && user && authorId !== user._id) {
          followStatesMap[authorId] = followState;
        }
        
        return {
          ...p,
          author: {
            ...p.author,
            isFollowing: followState,
            isVerified: p.author?.isVerified === true || p.author?.isVerified === 'true' || false
          }
        };
      });
      
      // Initialize follow states in context for all authors
      if (Object.keys(followStatesMap).length > 0) {
        setFollowStates(followStatesMap);
      }
      
      let returnedPosts = undefined;
      
      if (page === 1) {
        // Return the new posts for comparison in handleRefresh
        const newPosts = postsWithFollowState;
        setPosts(newPosts);
        postsRef.current = newPosts; // Update ref
        try { 
          localStorage.setItem('dl_feed_cache', JSON.stringify(newPosts.slice(0, 30))); 
          localStorage.setItem('dl_feed_cache_time', String(Date.now())); // Cache timestamp
        } catch {}
        
        // Store posts to return if this is a refresh
        if (isRefresh) {
          returnedPosts = newPosts;
        }
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p?._id).filter(Boolean));
          const newPosts = postsWithFollowState.filter(p => !existingIds.has(p._id));
          
          // For existing posts, preserve their current follow state
          // For new posts, use the follow state from API
          // For updated posts, use the new follow state from API
          const merged = prev.map(p => {
            const updated = postsWithFollowState.find(np => np._id === p._id);
            if (updated) {
              // Post was updated - use new follow state from API
              return {
                ...p,
                author: {
                  ...p.author,
                  isFollowing: updated.author?.isFollowing ?? p.author?.isFollowing,
                  isVerified: updated.author?.isVerified === true || updated.author?.isVerified === 'true' || p.author?.isVerified === true || p.author?.isVerified === 'true' || false
                }
              };
            }
            // Existing post not in update - keep current state
            return p;
          });
          
          // Add new posts that weren't in the existing list
          const next = [...merged, ...newPosts];
          postsRef.current = next; // Update ref
          try { localStorage.setItem('dl_feed_cache', JSON.stringify(next.slice(0, 30))); } catch {}
          return next;
        });
      }
      
      const currentPageFromApi = Number(data.currentPage) || page;
      const totalPagesFromApi = Number(data.totalPages) || currentPageFromApi;
      setHasMore(currentPageFromApi < totalPagesFromApi);
      setCurrentPage(currentPageFromApi);
      try { localStorage.setItem('dl_feed_currentPage', String(currentPageFromApi)); } catch {}
      
      // Return posts if this was a refresh
      return returnedPosts;
    } catch (error) {
      console.error('Error fetching posts:', error);
      
      // Retry logic for network errors
      if (retryCount < maxRetries && (
        error.code === 'ECONNABORTED' || // Timeout
        error.code === 'ERR_NETWORK' || // Network error
        !error.response // No response (connection issue)
      )) {
        // Exponential backoff retry
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`Retrying posts fetch (attempt ${retryCount + 1}/${maxRetries}) after ${delay}ms...`);
        setTimeout(() => {
          fetchPosts(page, retryCount + 1);
        }, delay);
        return;
      }
      
      // Only show error on first page load if we have no posts
      if (page === 1 && posts.length === 0) {
        // Try to load from cache if timeout occurs
        if (error.code === 'ECONNABORTED') {
          try {
            const cached = localStorage.getItem('dl_feed_cache');
            if (cached) {
              const cachedPosts = JSON.parse(cached);
              if (Array.isArray(cachedPosts) && cachedPosts.length > 0) {
                console.log('Loading posts from cache due to timeout');
                setPosts(cachedPosts);
                setError('Connection slow. Showing cached posts. Pull down to refresh.');
                return;
              }
            }
          } catch (e) {
            // Cache read failed, continue with error
          }
          setError('Request timed out. Please check your connection and try again.');
        } else if (error.response?.status === 429) {
          setError('Too many requests. Please wait a moment and try again.');
        } else if (error.code === 'ERR_NETWORK') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Failed to load posts. Please try again.');
        }
        setPosts([]);
      } else if (page === 1) {
        // If we have existing posts, don't clear them on error
        // Just log the error silently
        console.warn('Failed to refresh posts, keeping existing posts');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      // Return undefined on error
      return undefined;
    }
  };

  const fetchPopularPosts = async () => {
    try {
      console.log('Fetching popular posts...');
      const response = await axios.get('/api/posts/popular?limit=5');
      const payload = response?.data;
      const popular = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.posts)
          ? payload.posts
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      setPopularPosts(popular);
      try { localStorage.setItem('dl_popular_cache', JSON.stringify(popular)); } catch {}
      console.log('Popular posts fetched:', response.data);
    } catch (error) {
      console.error('Error fetching popular posts:', error);
      // Don't set error for popular posts as it's not critical
    }
  };

  // Update ref whenever posts change
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const handleNewPost = (newPost, options = {}) => {
    // Ensure author is populated for downstream pages
    const normalized = {
      ...newPost,
      author: {
        ...(newPost.author || user),
        // Preserve isFollowing state if available
        isFollowing: newPost.author?.isFollowing ?? (newPost.author?._id === user?._id ? false : undefined),
        // Preserve isVerified state
        isVerified: newPost.author?.isVerified === true || newPost.author?.isVerified === 'true' || (newPost.author || user)?.isVerified === true || (newPost.author || user)?.isVerified === 'true' || false
      },
    };
    setPosts(prev => {
      // Handle rollback
      if (options.rollbackOptimistic) {
        return prev.filter(p => typeof p._id === 'string' && p._id.startsWith('temp-') === false);
      }
      // Replace temp with real and de-duplicate by _id (handles socket + optimistic race)
      if (options.replaceTempId) {
        const replaced = prev.map(p => (p._id === options.replaceTempId ? normalized : p));
        // De-duplicate
        const seen = new Set();
        const deduped = [];
        for (const p of replaced) {
          const id = p?._id;
          if (!id) continue;
          if (!seen.has(id)) {
            seen.add(id);
            deduped.push(p);
          }
        }
        // Ensure the final list contains the normalized post once at the top
        const withoutNormalized = deduped.filter(p => p._id !== normalized._id);
        const next = [normalized, ...withoutNormalized];
        try { localStorage.setItem('dl_feed_cache', JSON.stringify(next.slice(0, 30))); } catch {}
        return next;
      }
      // Default prepend if not exists
      const exists = prev.some(p => p && normalized && p._id === normalized._id);
      const next = exists ? prev : [normalized, ...prev];
      try { localStorage.setItem('dl_feed_cache', JSON.stringify(next.slice(0, 30))); } catch {}
      return next;
    });
    fetchPopularPosts();
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => {
      const authorId = updatedPost.author?._id || updatedPost.author?.id;
      const newFollowingState = updatedPost.author?.isFollowing;
      
      // Check if follow state changed
      const existingPost = prev.find(p => p._id === updatedPost._id);
      const followStateChanged = existingPost?.author?.isFollowing !== newFollowingState && newFollowingState !== undefined;
      
      return prev.map(post => {
        // Update the specific post that was updated
        if (post._id === updatedPost._id) {
          return {
            ...updatedPost,
            // Explicitly preserve likes and likeCount from updatedPost
            likes: updatedPost.likes !== undefined ? updatedPost.likes : post.likes,
            likeCount: updatedPost.likeCount !== undefined ? updatedPost.likeCount : post.likeCount,
            comments: updatedPost.comments !== undefined ? updatedPost.comments : post.comments,
            commentCount: updatedPost.commentCount !== undefined ? updatedPost.commentCount : post.commentCount,
            author: {
              ...updatedPost.author,
              isFollowing: updatedPost.author?.isFollowing ?? post.author?.isFollowing,
              isVerified: updatedPost.author?.isVerified === true || updatedPost.author?.isVerified === 'true' || post.author?.isVerified === true || post.author?.isVerified === 'true' || false
            }
          };
        }
        
        // If follow state changed, update ALL posts from the same author
        if (followStateChanged && authorId) {
          const postAuthorId = post.author?._id || post.author?.id;
          if (postAuthorId === authorId) {
            return {
              ...post,
              author: {
                ...post.author,
                isFollowing: newFollowingState,
                isVerified: post.author?.isVerified === true || post.author?.isVerified === 'true' || false
              }
            };
          }
        }
        
        return post;
      });
    });
    fetchPopularPosts();
  };

  // No need to listen for follow state changes - PostCard components will automatically
  // reflect the state from FollowContext. The context handles state synchronization.

  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(post => post._id !== postId));
    fetchPopularPosts();
  };

  const loadMorePosts = () => {
    if (hasMore && !loading) {
      fetchPosts(currentPage + 1);
    }
  };

  const handleRefresh = async () => {
    setCurrentPage(1);
    setError(null);
    setRefreshMessage(null);
    
    // Store current post IDs to compare after refresh
    const currentPostIds = new Set(posts.map(p => p._id).filter(Boolean));
    const currentPostsCount = posts.length;
    
    // Fetch fresh posts
    await fetchPosts(1, 0, true);
    fetchPopularPosts();
    
    // Check if new posts were added after a short delay (to allow state to update)
    setTimeout(() => {
      // Use ref to get the latest posts value
      const latestPosts = postsRef.current;
      const newPostIds = new Set(latestPosts.map(p => p._id).filter(Boolean));
      const newPostsCount = latestPosts.length;
      
      // Find posts that weren't in the original list
      const newPostCount = Array.from(newPostIds).filter(id => !currentPostIds.has(id)).length;
      
      if (newPostCount > 0) {
        // New posts found
        setRefreshMessage(`Found ${newPostCount} new post${newPostCount > 1 ? 's' : ''}!`);
        setTimeout(() => setRefreshMessage(null), 3000);
      } else if (newPostsCount === 0) {
        // No posts at all
        setRefreshMessage('No posts available at the moment.');
        setTimeout(() => setRefreshMessage(null), 3000);
      } else if (newPostsCount === currentPostsCount && newPostCount === 0) {
        // Same number of posts, no new ones
        setRefreshMessage('You\'re all up to date! No new posts available.');
        setTimeout(() => setRefreshMessage(null), 3000);
      }
    }, 500);
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

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-1">
              <CreatePostSkeleton />
            </div>
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if user is not yet loaded
  if (!user) {
    return (
      <div className={styles.loginPrompt}>
        <div className={styles.loginPromptContent}>
          <div className={styles.loginPromptSpinner}></div>
          <p className={styles.loginPromptText}>Please log in to continue</p>
          <button 
            onClick={() => navigate('/')}
            className={styles.loginPromptButton}
          >
            Go to Login
          </button>
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
          {/* Left Column - Create Post */}
          <motion.div variants={itemVariants} className={styles.leftColumn}>
            <div className={styles.leftSticky}>
              <CreatePost onPostCreated={handleNewPost} />
              
              {/* Quick Actions */}
              <div className={styles.quickActions}>
                <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
                <div className={styles.quickActionsList}>
                  <button
                    onClick={() => navigate('/messages')}
                    className={styles.quickActionButton}
                  >
                    <MessageCircle className={styles.quickActionIcon} />
                    <span className={styles.quickActionText}>Messages</span>
                  </button>
                  
                  <button
                    onClick={() => navigate('/profile')}
                    className={styles.quickActionButton}
                  >
                    <Users className={styles.quickActionIcon} />
                    <span className={styles.quickActionText}>Profile</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowTrending(true);
                      try { localStorage.setItem('dl_feed_showTrending', 'true'); } catch {}
                    }}
                    className={styles.quickActionButton}
                  >
                    <TrendingUp className={styles.quickActionIcon} />
                    <span className={styles.quickActionText}>Trending Now</span>
                  </button>
                  
                  <button className={styles.quickActionPrimary}>
                    <Users className={styles.quickActionIcon} />
                    <span className={styles.quickActionText}>Discover Users</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Middle Column - Feed */}
          <motion.div variants={itemVariants} className={styles.middleColumn}>
            <div className={styles.feedHeader}>
              <div className={styles.feedHeaderContent}>
                <div>
                  <h2 className={styles.feedTitle}>Your Feed</h2>
                  <p className={styles.feedSubtitle}>Stay updated with the latest from your network</p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className={styles.refreshButton}
                  title="Refresh feed"
                >
                  <RefreshCw className={`${styles.refreshIcon} ${refreshing ? styles.refreshIconSpinning : ''}`} />
                  <span className={styles.refreshText}>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Refresh Feedback Message */}
            {refreshMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={styles.refreshMessage}
              >
                <p className={styles.refreshMessageText}>{refreshMessage}</p>
              </motion.div>
            )}

            {!showTrending && error && (
              <div className={styles.feedError}>
                <p className={styles.feedErrorText}>{error}</p>
                <button 
                  onClick={() => {
                    setError(null);
                    fetchPosts();
                    fetchPopularPosts();
                  }}
                  className={styles.feedErrorRetry}
                >
                  Try Again
                </button>
              </div>
            )}
            {!showTrending && (loading && posts.length === 0) ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            ) : !showTrending && posts.length === 0 ? (
              <div className={styles.feedEmpty}>
                <div className={styles.feedEmptyContent}>
                  <MessageCircle className={styles.feedEmptyIcon} />
                  <h3 className={styles.feedEmptyTitle}>No posts yet</h3>
                  <p className={styles.feedEmptySubtitle}>Be the first to share something amazing!</p>
                </div>
              </div>
            ) : showTrending ? (
              <div className={styles.feedPosts}>
                {/* Trending view replaces feed */}
                <div className={styles.feedHeader}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className={styles.feedTitle}>Trending Now</h2>
                      <p className={styles.feedSubtitle}>Most popular posts in the community</p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowTrending(false);
                        try { localStorage.setItem('dl_feed_showTrending', 'false'); } catch {}
                      }} 
                      className={styles.feedErrorRetry}
                    >
                      Back to Feed
                    </button>
                  </div>
                </div>
                <PopularPosts posts={popularPosts} loading={loading && popularPosts.length === 0} />
              </div>
            ) : (
              <div className={styles.feedPosts}>
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    currentUser={user}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                    getDefaultProfilePicture={getDefaultProfilePicture}
                  />
                ))}
                
                {hasMore && posts.length > 0 && (
                  <div className={styles.feedLoadMore}>
                    <button
                      onClick={loadMorePosts}
                      disabled={loading}
                      className={styles.feedLoadMoreButton}
                    >
                      {loading ? (
                        <>
                          <div className="loading loading-spinner loading-xs mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More Posts'
                      )}
                    </button>
                  </div>
                )}
                
                {!hasMore && posts.length > 0 && (
                  <div className={styles.feedEnd}>
                    <p>You&apos;ve reached the end of your feed!</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default MainPage;


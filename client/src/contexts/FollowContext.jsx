import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const FollowContext = createContext();

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
};

export const FollowProvider = ({ children }) => {
  const { user: currentUser } = useAuth();
  // Map of userId -> boolean (whether current user is following them)
  const [followingMap, setFollowingMap] = useState(new Map());
  // Map of userId -> boolean (whether follow operation is in progress)
  const [loadingMap, setLoadingMap] = useState(new Map());
  // Track which user ID we've initialized for (to re-initialize on user change)
  const [initializedForUserId, setInitializedForUserId] = useState(null);

  // Check if a follow state exists in the context
  const hasFollowState = useCallback((userId) => {
    if (!userId) return false;
    return followingMap.has(userId);
  }, [followingMap]);

  // Check if current user is following a specific user
  const isFollowing = useCallback((userId) => {
    if (!userId || !currentUser) return false;
    // If we have it in our map, use that
    if (followingMap.has(userId)) {
      return followingMap.get(userId);
    }
    // Otherwise default to false (will be updated when data loads)
    return false;
  }, [followingMap, currentUser]);

  // Check if a follow operation is in progress for a user
  const isFollowingUser = useCallback((userId) => {
    if (!userId) return false;
    return loadingMap.get(userId) || false;
  }, [loadingMap]);

  // Toggle follow status for a user
  const toggleFollow = useCallback(async (userId) => {
    if (!userId || !currentUser || userId === currentUser._id) {
      return { success: false, message: 'Invalid user' };
    }

    const previousState = isFollowing(userId);
    setLoadingMap(prev => new Map(prev).set(userId, true));
    
    // Optimistic update
    setFollowingMap(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, !previousState);
      return newMap;
    });

    try {
      const response = await axios.post(`/api/users/${userId}/follow`);
      const newFollowingState = response.data.isFollowing;
      
      // Update with actual state from server
      setFollowingMap(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, newFollowingState);
        return newMap;
      });

      return { 
        success: true, 
        isFollowing: newFollowingState,
        data: response.data
      };
    } catch (error) {
      console.error('Error following user:', error);
      
      // Revert optimistic update on error
      setFollowingMap(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, previousState);
        return newMap;
      });

      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to follow user',
        isFollowing: previousState
      };
    } finally {
      setLoadingMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }
  }, [currentUser, isFollowing]);

  // Initialize follow state from user data (e.g., from API responses)
  // Only sets if the state doesn't already exist in context (preserves existing state)
  const setFollowState = useCallback((userId, isFollowingValue) => {
    if (!userId) return;
    setFollowingMap(prev => {
      // Only set if the state doesn't already exist (preserve user's follow actions)
      if (prev.has(userId)) {
        return prev; // Don't overwrite existing state
      }
      const newMap = new Map(prev);
      newMap.set(userId, isFollowingValue);
      return newMap;
    });
  }, []);

  // Initialize multiple follow states at once (useful when loading posts/users)
  // Only sets states that don't already exist in context (preserves existing state)
  const setFollowStates = useCallback((states) => {
    if (!states || typeof states !== 'object') return;
    setFollowingMap(prev => {
      const newMap = new Map(prev);
      Object.entries(states).forEach(([userId, isFollowingValue]) => {
        if (userId && !prev.has(userId)) {
          // Only set if the state doesn't already exist (preserve user's follow actions)
          newMap.set(userId, Boolean(isFollowingValue));
        }
      });
      return newMap;
    });
  }, []);

  // Clear all follow states (useful on logout)
  const clearFollowStates = useCallback(() => {
    setFollowingMap(new Map());
    setLoadingMap(new Map());
  }, []);

  // Initialize follow states from user's following array when user logs in
  useEffect(() => {
    if (currentUser && currentUser.following) {
      const currentUserId = currentUser._id || currentUser.id;
      
      // Initialize if we haven't initialized yet, or if the user changed
      if (!initializedForUserId || initializedForUserId !== currentUserId) {
        // Initialize follow states from user's following array
        const followingArray = Array.isArray(currentUser.following) 
          ? currentUser.following 
          : [];
        
        // Create a map of userId -> true for all users the current user is following
        const initialFollowStates = {};
        followingArray.forEach(followedUser => {
          const userId = typeof followedUser === 'object' 
            ? (followedUser._id || followedUser.id) 
            : followedUser;
          if (userId) {
            initialFollowStates[userId] = true;
          }
        });
        
        // Force-set all follow states on initial load (overwrite any existing states)
        setFollowingMap(() => {
          const newMap = new Map();
          // Clear existing states and set new ones from user's following array
          Object.entries(initialFollowStates).forEach(([userId, isFollowing]) => {
            newMap.set(userId, Boolean(isFollowing));
          });
          return newMap;
        });
        setInitializedForUserId(currentUserId);
      }
    } else if (!currentUser) {
      // Clear follow states when user logs out
      clearFollowStates();
      setInitializedForUserId(null);
    }
  }, [currentUser, initializedForUserId, clearFollowStates]);

  const value = {
    isFollowing,
    hasFollowState,
    isFollowingUser,
    toggleFollow,
    setFollowState,
    setFollowStates,
    clearFollowStates,
  };

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
};


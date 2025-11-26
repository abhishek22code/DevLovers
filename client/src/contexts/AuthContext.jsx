import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { disconnectSocket, getSocket } from '../socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up axios defaults
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Set up axios interceptor to handle 401 errors globally
  useEffect(() => {
    // Add response interceptor to handle 401 errors globally
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle 401 Unauthorized errors
        if (error?.response?.status === 401) {
          // Only handle if we have a token (to avoid infinite loops)
          const currentToken = localStorage.getItem('token');
          if (currentToken) {
            console.warn('Token expired or invalid. Clearing authentication.');
            
            // Clear token and user
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
            
            // Clear user state
            setUser(null);
            
            // Disconnect socket
            try {
              disconnectSocket();
            } catch (e) {
              // Socket might not be connected
            }
            
            // Don't redirect automatically - let components handle it
            // This prevents redirect loops and allows graceful degradation
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [setUser]);

  // Update axios headers when user changes
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      try {
        localStorage.setItem('user', JSON.stringify(user));
      } catch (e) {
        // localStorage may be unavailable in some environments
      }
    } else {
      delete axios.defaults.headers.common['Authorization'];
      try {
        localStorage.removeItem('user');
      } catch (e) {
        // localStorage may be unavailable in some environments
      }
    }
  }, [user]);

  // Check if user is authenticated on app load
  useEffect(() => {
    let isMounted = true;
    let checkAuthTimeout = null;
    let retryCount = 0;
    const maxRetries = 2; // Reduced to 2 retries
    let isChecking = false; // Flag to prevent multiple simultaneous checks
    let lastCheckTime = 0; // Track last check time to prevent rapid retries
    
    const checkAuth = async () => {
      // Prevent multiple simultaneous calls
      if (isChecking) {
        return;
      }
      
      // Prevent rapid successive calls (minimum 1 second between calls)
      const now = Date.now();
      if (now - lastCheckTime < 1000) {
        return;
      }
      lastCheckTime = now;
      
      isChecking = true;
      const token = localStorage.getItem('token');
      
      // Restore cached user immediately to avoid flicker
      if (!user) {
        try {
          const cached = localStorage.getItem('user');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed._id) {
              setUser(parsed);
            }
          }
        } catch (e) {
          // localStorage may be unavailable in some environments
        }
      }

      if (token) {
        // Ensure header set for this request
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await axios.get('/api/auth/me', {
            timeout: 10000 // 10 second timeout
          });
          
          if (isMounted) {
            const freshUser = response.data;
            setUser(freshUser);
            // Update cache with fresh data including isVerified
            try {
              localStorage.setItem('user', JSON.stringify(freshUser));
            } catch (e) {
              // localStorage may be unavailable in some environments
            }
            retryCount = 0; // Reset retry count on success
          }
        } catch (error) {
          if (!isMounted) {
            isChecking = false;
            return;
          }
          
          // Handle rate limiting errors gracefully - but don't retry immediately
          if (error?.response?.status === 429) {
            console.warn('Rate limited. Using cached user. Will retry on next page load.');
            // Don't retry - just use cached user and stop
            retryCount = 0;
            isChecking = false;
            if (isMounted) {
              setLoading(false);
            }
            return;
          } else if (error?.response?.status === 401) {
            localStorage.removeItem('token');
            try { localStorage.removeItem('user'); } catch (e) {
              // localStorage may be unavailable in some environments
            }
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            retryCount = 0;
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
      
      isChecking = false;
    };

    // Debounce checkAuth to prevent multiple simultaneous calls
    checkAuthTimeout = setTimeout(() => {
      checkAuth();
    }, 200); // Increased debounce delay

    return () => {
      isMounted = false;
      isChecking = false;
      if (checkAuthTimeout) {
        clearTimeout(checkAuthTimeout);
      }
    };
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      
      // Validate input on client side
      if (!email || !password) {
        const message = 'Email and password are required';
        setError(message);
        return { success: false, message };
      }
      
      const response = await axios.post('/api/auth/login', { 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      // Check if response has required data
      if (!response.data || !response.data.token || !response.data.user) {
        const message = 'Invalid response from server';
        setError(message);
        return { success: false, message };
      }
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      try {
        localStorage.setItem('user', JSON.stringify(user));
      } catch (e) {
        // localStorage may be unavailable in some environments
      }
      
      // Reconnect socket with new token
      try {
        disconnectSocket();
        getSocket(); // Reconnect with new token
      } catch (e) {
        // Socket might not be needed yet
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Login failed';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 429) {
          const retryAfter = error.response.data?.retryAfter || 15 * 60; // Default to 15 minutes
          const minutes = Math.ceil(retryAfter / 60);
          message = `Too many login attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
        } else {
          message = error.response.data?.message || 'Login failed';
        }
      } else if (error.request) {
        // Request made but no response
        message = 'Unable to reach server. Please check your connection.';
      } else {
        // Error setting up request
        message = error.message || 'Login failed';
      }
      
      setError(message);
      return { success: false, message };
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/signup', userData);
      const requiresVerification = response.data?.requiresVerification;
      
      // Don't automatically log in the user after signup
      // Just return success without setting token or user
      return { success: true, requiresVerification };
    } catch (error) {
      const message = error.response?.data?.message || 'Signup failed';
      setError(message);
      return { success: false, message };
    }
  };

  const verifyOtp = async (email, code) => {
    try {
      setError(null);
      await axios.post('/api/auth/verify-otp', { email, code });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      setError(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await axios.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      try { localStorage.removeItem('user'); } catch (e) {
        // localStorage may be unavailable in some environments
      }
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setError(null);
      
      // Disconnect socket on logout
      try {
        disconnectSocket();
      } catch (e) {
        // Socket might not be initialized
      }
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await axios.put('/api/auth/profile', profileData);
      const updatedUser = response.data.user;
      setUser(updatedUser);
      // Update cache with fresh data
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (e) {
        // localStorage may be unavailable in some environments
      }
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      setError(message);
      return { success: false, message };
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    updateProfile,
    verifyOtp,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

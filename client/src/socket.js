import { io } from 'socket.io-client';

let socketInstance = null;
let reconnectAttempts = 0;
let initialConnectionFailures = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function getSocket() {
  // If socket instance exists (even if disconnected), return it
  // This prevents creating multiple socket instances
  if (socketInstance) {
    // If disconnected and we have a token, only reconnect if reconnection is enabled
    if (!socketInstance.connected) {
      const token = localStorage.getItem('token');
      // Only try to reconnect if reconnection is still enabled and we haven't exceeded max attempts
      if (token && socketInstance.io.opts.reconnection && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        // Don't manually connect - let the auto-reconnection handle it
        // socketInstance.connect();
      }
    }
    return socketInstance;
  }

    // Determine socket URL based on environment
  // Priority:
  // 1. VITE_SOCKET_URL (explicit socket base URL, no /api)
  // 2. VITE_API_URL with /api stripped
  // 3. Localhost dev fallback
  let url;

  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;

  if (explicitSocketUrl) {
    // Use explicitly configured socket URL
    url = explicitSocketUrl.replace(/\/$/, ''); // strip trailing slash
  } else if (typeof window !== 'undefined' && window.location) {
    const localhostHostname = import.meta.env.VITE_LOCALHOST_HOSTNAME || 'localhost';
    const isProduction =
      window.location.hostname !== localhostHostname &&
      window.location.hostname !== '127.0.0.1';

    if (isProduction) {
      // Production: try VITE_API_URL first, strip /api if present
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      // Remove /api or /api/ at the end if present
      url = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    } else {
      // Development: use localhost + VITE_SERVER_PORT (default 3001)
      const serverPort = import.meta.env.VITE_SERVER_PORT || '3001';
      url = `${window.location.protocol}//${window.location.hostname}:${serverPort}`;
    }
  } else {
    // Non-browser (fallback): assume localhost dev
    const localhostHost = import.meta.env.VITE_LOCALHOST_HOSTNAME || 'localhost';
    const serverPort = import.meta.env.VITE_SERVER_PORT || '3001';
    url = `http://${localhostHost}:${serverPort}`;
  }


  // Get token from localStorage
  const token = localStorage.getItem('token');

  // Only create socket if token exists
  if (!token) {
    console.warn('⚠️ No token found, socket will not connect');
    return null;
  }

  socketInstance = io(url, {
    transports: ['websocket', 'polling'], // Allow fallback to polling if websocket fails
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS, // Limit reconnection attempts
    reconnectionDelay: 2000, // Start with 2 seconds
    reconnectionDelayMax: 10000, // Max 10 seconds between attempts
    timeout: 20000,
    auth: {
      token: token
    },
    query: {
      token: token
    }
  });

  // Reset reconnect attempts on successful connection
  socketInstance.on('connect', () => {
    console.log('🔌 Socket connected');
    reconnectAttempts = 0;
    initialConnectionFailures = 0; // Reset initial failures on successful connection
    
    // Re-authenticate with token on connect
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      socketInstance.auth = { token: currentToken };
    }
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    // Don't increment attempts here - only track initial connection failures
  });

  socketInstance.on('connect_error', (error) => {
    // Track initial connection failures (before first successful connection)
    if (!socketInstance.connected) {
      initialConnectionFailures++;
      
      // If authentication fails, clear token and stop trying
      if (error.message && (error.message.includes('Authentication') || error.message.includes('Invalid token') || error.message.includes('Token expired'))) {
        console.warn('🔌 Socket authentication failed. Token may be expired or invalid.');
        localStorage.removeItem('token');
        socketInstance.io.opts.reconnection = false;
        socketInstance.io.reconnect = false;
        socketInstance.disconnect();
        socketInstance = null;
        return;
      }
      
      // Stop trying after max attempts for initial connection
      if (initialConnectionFailures >= MAX_RECONNECT_ATTEMPTS) {
        console.warn(`⚠️ Initial socket connection failed after ${MAX_RECONNECT_ATTEMPTS} attempts. Socket will stop trying to connect.`);
        socketInstance.io.opts.reconnection = false;
        socketInstance.io.reconnect = false;
        return;
      }
      
      // Only log first few errors to avoid spam
      if (initialConnectionFailures <= 3) {
        console.error(`🔌 Socket connection error (attempt ${initialConnectionFailures}/${MAX_RECONNECT_ATTEMPTS}):`, error.message);
      }
    }
  });

  // Track reconnection attempts using Socket.IO's internal counter
  socketInstance.io.on('reconnect_attempt', (attemptNumber) => {
    reconnectAttempts = attemptNumber;
    if (attemptNumber <= MAX_RECONNECT_ATTEMPTS) {
      console.log(`🔄 Socket reconnection attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`);
    }
    
    // Stop reconnecting after max attempts
    if (attemptNumber >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(`⚠️ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Socket will stop trying to connect.`);
      socketInstance.io.opts.reconnection = false;
      socketInstance.io.reconnect = false; // Disable reconnection
    }
  });

  // Handle successful reconnection
  socketInstance.io.on('reconnect', (attemptNumber) => {
    console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
    reconnectAttempts = 0; // Reset on successful reconnection
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    reconnectAttempts = 0;
    initialConnectionFailures = 0;
  }
}

export function resetSocket() {
  // Reset socket instance to allow fresh connection attempt
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  reconnectAttempts = 0;
  initialConnectionFailures = 0;
}

export default getSocket;










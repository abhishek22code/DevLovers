# DevLovers - Social Media Platform for Developers

A full-stack MERN social media application designed specifically for developers to connect, share code, collaborate, and build a community.

## 🚀 Major Features

### 🔐 Authentication & User Management
- **User Registration**: Direct signup with username, email, password, bio, and gender
- **User Login**: Secure JWT-based authentication
- **Profile Management**: 
  - Editable profile with username, bio, profile picture
  - Skills management with predefined suggestions
  - Profile statistics (followers, following, posts count)
- **Account Deletion**: Complete profile deletion with cascade cleanup (posts, messages, notifications, relationships)
- **Protected Routes**: Route protection for authenticated users

### 📝 Posts & Content
- **Text Posts**: Create, edit, and delete text-based posts with images
- **Code Posts**: Create and share C++/Java code snippets
- **Post Interactions**:
  - Like/unlike posts
  - Comment on posts with nested comments
  - Like comments
  - Edit and delete own posts
- **Post Feed**: 
  - Infinite scroll pagination
  - Real-time updates via Socket.IO
  - Popular posts algorithm
  - User-specific post feeds
- **Image Support**: Upload and display images in posts
- **Tags**: Tag posts for better discoverability

### 💬 Real-Time Messaging
- **Direct Messaging**: One-on-one messaging between users
- **Conversation Management**: View all conversations with unread counts
- **Real-Time Chat**: 
  - Instant message delivery via Socket.IO
  - Typing indicators
  - Online/offline status
  - Message read receipts
- **Message History**: Permanent message storage and retrieval
- **Mutual Follow Requirement**: Only mutual followers can message each other

### 🔔 Notifications System
- **Real-Time Notifications**: Socket.IO-powered instant notifications
- **Notification Types**: 
  - Follow notifications
  - (Extensible for more types)
- **Notification Management**:
  - Unread notification count badge
  - Mark notifications as read
  - Notification dropdown with recent notifications
  - Auto-expire notifications after 24 hours

### 👥 Social Features
- **Follow/Unfollow System**: Follow other developers
- **Followers & Following**: 
  - View followers and following lists
  - Modal views with user profiles
  - Real-time follower count updates
- **User Profiles**: 
  - View other users' profiles
  - See their posts, skills, and bio
  - Follow/unfollow from profile page
- **User Search**: Search users by username or skills

### 💻 Code Runner
- **Code Execution**: Run C++ and Java code snippets inline
- **Judge0 Integration**: Compile and execute code with optional stdin
- **Code Posts**: Create posts with executable code
- **Output Display**: View code execution results

### 🎨 UI/UX Features
- **Dark/Light Theme**: Toggle between dark and light modes with persistent preference
- **Responsive Design**: Mobile-first design optimized for all screen sizes
- **Modern UI**: 
  - Glassmorphism effects
  - Smooth animations with Framer Motion
  - Beautiful icons with Lucide React
- **Real-Time Updates**: Live updates without page refresh
- **Loading States**: Skeleton loaders for better UX
- **Error Handling**: Graceful error handling and user feedback

### 🔄 Real-Time Features (Socket.IO)
- **Real-Time Posts**: 
  - New post notifications
  - Post updates and deletions
  - Like and comment updates
- **Online Status**: 
  - Track user online/offline status
  - Real-time status updates for mutual follows
- **Live Notifications**: Instant notification delivery
- **Typing Indicators**: See when someone is typing in messages
- **Message Delivery**: Real-time message sending and receiving

### 🔍 Search & Discovery
- **User Search**: Search users by username or skills
- **Popular Posts**: Algorithm-based trending content
- **Post Filtering**: Filter posts by user, tags, or content

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development and building
- **React Router** for client-side routing
- **TailwindCSS** for utility-first styling
- **Framer Motion** for smooth animations
- **Lucide React** for beautiful icons
- **Axios** for HTTP requests
- **Socket.IO Client** for real-time communication
- **date-fns** for date formatting

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** (jsonwebtoken) for secure authentication
- **bcryptjs** for password hashing
- **Socket.IO** for real-time bidirectional communication
- **CORS** for cross-origin resource sharing
- **Helmet** for security headers
- **Morgan** for HTTP request logging
- **Express Rate Limit** for API rate limiting
- **Compression** for response compression

### Additional Services
- **Judge0 API** for code compilation and execution (optional)

## 📁 Project Structure

```
DevLovers/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ConfirmModal.jsx
│   │   │   ├── CreatePost.jsx
│   │   │   ├── FollowersModal.jsx
│   │   │   ├── Navigation.jsx
│   │   │   ├── NotificationIcon.jsx
│   │   │   ├── PopularPosts.jsx
│   │   │   ├── PostCard.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── SkeletonComponents.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── contexts/           # React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── FollowContext.jsx
│   │   ├── pages/              # Page components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── MainPage.jsx
│   │   │   ├── MessagesPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── UserProfilePage.jsx
│   │   ├── styles/             # CSS modules
│   │   ├── socket.js           # Socket.IO client setup
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                      # Express backend
│   ├── controllers/            # Route controllers
│   │   ├── authController.js
│   │   ├── messagesController.js
│   │   ├── notificationsController.js
│   │   ├── postsController.js
│   │   ├── runnerController.js
│   │   └── usersController.js
│   ├── middleware/             # Custom middleware
│   │   ├── auth.js
│   │   └── socketAuth.js
│   ├── models/                 # MongoDB schemas
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── Post.js
│   │   └── User.js
│   ├── routes/                 # API routes
│   │   ├── auth.js
│   │   ├── messages.js
│   │   ├── notifications.js
│   │   ├── posts.js
│   │   ├── runner.js
│   │   └── users.js
│   ├── services/               # External services
│   │   └── emailService.js
│   ├── index.js                # Server entry point
│   └── package.json
└── package.json                 # Root package.json
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** (local installation or MongoDB Atlas)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DevLovers
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   Navigate to the server directory:
   ```bash
   cd server
   cp env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/devlovers
   # Or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/devlovers
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   
   # CORS Configuration
   CLIENT_URL=http://localhost:3000
   CLIENT_URL_ALT=http://127.0.0.1:3000
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   
   # Socket.IO Configuration
   SOCKET_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   
   # Code Runner (Optional)
   FEATURE_CODE_RUNNER=true
   JUDGE0_URL=https://your-judge0-instance
   JUDGE0_KEY=optional-token
   ```

4. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud) - no local setup needed
   ```

5. **Run the application**
   ```bash
   # Development mode (runs both client and server)
   npm run dev
   
   # Or run separately:
   npm run server    # Backend on port 3001
   npm run client    # Frontend on port 3000
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Health Check: http://localhost:3001/api/health

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `DELETE /api/auth/profile` - Delete user profile (with cascade cleanup)
- `POST /api/auth/logout` - User logout

### Posts
- `GET /api/posts` - Get all posts (paginated)
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get specific post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comment` - Add comment to post
- `POST /api/posts/:id/comments/:commentId/like` - Like/unlike comment
- `GET /api/posts/popular` - Get popular posts

### Users
- `GET /api/users` - Get all users (searchable)
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/posts` - Get user's posts
- `POST /api/users/:id/follow` - Follow/unfollow user
- `GET /api/users/:id/followers` - Get user's followers
- `GET /api/users/:id/following` - Get user's following
- `GET /api/users/search/skills` - Search users by skills

### Messages
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/:userId` - Get messages with a specific user
- `POST /api/messages/send` - Send a message
- `POST /api/messages/read` - Mark messages as read
- `GET /api/messages/unread/count` - Get unread message count

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread/count` - Get unread notification count
- `POST /api/notifications/read` - Mark all notifications as read
- `POST /api/notifications/:id/read` - Mark single notification as read

### Code Runner (Optional)
- `POST /api/runner/compile-run` - Compile and run code (C++/Java)

   Request Body:
   ```json
   {
     "language": "cpp|java",
     "sourceCode": "...",
     "stdin": "optional input"
   }
   ```

### Health Check
- `GET /api/health` - API health check

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse (disabled in development)
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for Express.js
- **Socket Authentication**: JWT-based authentication for Socket.IO connections
- **Protected Routes**: Client and server-side route protection

## 📱 Pages & Features

### Landing Page
- Beautiful animated landing page
- Login and signup forms
- Direct registration (no email verification required)
- Form validation
- Responsive design

### Main Page (Feed)
- Three-column layout
- Post creation form with image upload
- Infinite scroll feed with real-time updates
- Popular posts sidebar
- Real-time post interactions (likes, comments)
- Socket.IO integration for live updates

### Messages Page
- Real-time messaging interface
- Conversation list with unread counts
- Typing indicators
- Online/offline status
- Message read receipts
- Search conversations
- Mutual follow requirement for messaging

### Profile Page
- Editable user profile
- Profile picture upload
- Skills management with suggestions
- Bio editing
- User statistics (followers, following, posts)
- Personal post feed
- Followers/Following modals
- Delete profile functionality

### User Profile Page
- View other users' profiles
- Follow/unfollow functionality
- View user's posts
- User statistics
- Skills and bio display

## 🎨 UI Components

### Design System
- **Glassmorphism**: Semi-transparent backgrounds with backdrop blur
- **Modern Cards**: Elegant card designs with shadows
- **Smooth Animations**: Framer Motion for page transitions
- **Responsive Layout**: Mobile-first design approach
- **Theme Support**: Dark and light mode toggle

### Key Components
- **Navigation**: Main navigation with notifications, theme toggle
- **PostCard**: Interactive post display with like, comment, edit, delete
- **CreatePost**: Post creation form with image upload
- **FollowersModal**: Modal for viewing followers/following
- **NotificationIcon**: Real-time notification bell with dropdown
- **ThemeToggle**: Dark/light mode switcher
- **SkeletonComponents**: Loading state components

## 🔄 Real-Time Features

### Socket.IO Events

#### Client → Server
- `getOnlineStatus` - Request online status for users
- `typing` - Send typing indicator

#### Server → Client
- `post:created` - New post created
- `post:updated` - Post updated
- `post:deleted` - Post deleted
- `post:liked` - Post liked/unliked
- `post:commented` - Comment added to post
- `newMessage` - New message received
- `newNotification` - New notification received
- `userOnline` - User came online
- `userOffline` - User went offline
- `typing` - User is typing
- `onlineStatus` - Online status response

## 🚀 Deployment

### Environment Variables for Production

Make sure to set the following environment variables in your production environment:

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
ALLOWED_ORIGINS=https://yourdomain.com
SOCKET_CORS_ORIGINS=https://yourdomain.com
```

### Build for Production

```bash
# Build frontend
cd client
npm run build

# The built files will be in client/dist/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React** - UI library
- **Express.js** - Backend framework
- **MongoDB** - Database
- **Socket.IO** - Real-time communication
- **TailwindCSS** - CSS framework
- **Framer Motion** - Animation library
- **Lucide** - Icon library
- **Judge0** - Code execution service

---

**Happy Coding! 🚀💻**

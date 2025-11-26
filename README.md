# DevLovers - Social Media App for Developers

A full-stack MERN social media application designed specifically for developers to connect, share code, and collaborate.

## 🚀 Features

- **Authentication System**: JWT-based signup, login, and logout
- **Social Feed**: Create, read, update, and delete posts with images and tags
- **Interactive Posts**: Like, comment, and engage with community content
- **User Profiles**: Customizable profiles with bio, skills, and post history
- **Messaging System**: Simple chat interface for developer collaboration
- **Popular Posts**: Algorithm-based ranking of trending content
- **Responsive Design**: Modern UI with glassmorphism effects and animations
- **Real-time Updates**: Dynamic content updates without page refresh
 - **Code Posts & Runner**: Create C++/Java code posts and run them inline

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **TailwindCSS** for utility-first styling
- **Framer Motion** for smooth animations
- **Lucide React** for beautiful icons
- **React Router** for navigation

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for secure authentication
- **bcryptjs** for password hashing
- **CORS, Helmet, Morgan** for security and logging

## 📁 Project Structure

```
devlovers/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth)
│   │   ├── pages/         # Page components
│   │   └── index.css      # Global styles
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   ├── middleware/        # Custom middleware
│   ├── package.json
│   └── index.js
└── package.json           # Root package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd devlovers
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   ```bash
   cd server
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/devlovers
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

4. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   ```

5. **Run the application**
   ```bash
   # Development mode (both client and server)
   npm run dev
   
   # Or run separately:
   npm run server    # Backend on port 5000
   npm run client    # Frontend on port 3000
   ```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - User logout

### Posts
- `GET /api/posts` - Get all posts (paginated)
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get specific post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comment` - Add comment
- `GET /api/posts/popular` - Get popular posts

### Runner
- `POST /api/runner/compile-run` - Compile and run code (C++/Java)

Body:
```json
{ "language": "cpp|java", "sourceCode": "...", "stdin": "optional" }
```

Configure env in `server/.env`:
```
JUDGE0_URL=https://your-judge0-instance
JUDGE0_KEY=optional-token
```

### Users
- `GET /api/users` - Get all users (searchable)
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/posts` - Get user's posts
- `POST /api/users/:id/follow` - Follow/unfollow user
- `GET /api/users/:id/followers` - Get user's followers
- `GET /api/users/:id/following` - Get user's following

## 🎨 UI Components

### Glassmorphism Design
- **Glass Cards**: Semi-transparent backgrounds with backdrop blur
- **Glass Inputs**: Elegant form inputs with subtle borders
- **Glass Buttons**: Interactive buttons with hover effects

### Animations
- **Framer Motion**: Smooth page transitions and component animations
- **Staggered Animations**: Sequential loading of content
- **Hover Effects**: Interactive feedback on user actions

### Responsive Layout
- **Mobile-First**: Optimized for all screen sizes
- **Grid System**: Flexible layouts using CSS Grid
- **Breakpoints**: TailwindCSS responsive utilities

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Cross-origin resource sharing security
- **Helmet**: Security headers for Express.js

## 📱 Pages

### 1. Landing Page
- Space-like black gradient background
- Animated text: "developers" → "lovers" → "devlovers"
- Glassmorphism login/signup forms
- Responsive design for all devices

### 2. Main Page (Feed)
- Three-column layout with glassmorphism cards
- Post creation form with image upload
- Infinite scroll feed with posts
- Popular posts sidebar
- Quick action buttons

### 3. Messages Page
- Two-column layout for conversations and chat
- Search functionality for conversations
- Mock chat interface (ready for real-time implementation)
- Online/offline status indicators

### 4. Profile Page
- Editable user profile with bio and skills
- Profile picture upload
- User statistics (followers, following, posts)
- Personal post feed
- Responsive profile layout

## 🚀 Future Enhancements

- **Real-time Messaging**: WebSocket integration for live chat
- **Push Notifications**: Browser notifications for engagement
- **File Sharing**: Code snippet and file upload support
- **Advanced Search**: Elasticsearch integration
- **Mobile App**: React Native version
- **Dark/Light Themes**: User preference system
- **Code Syntax Highlighting**: Support for multiple programming languages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TailwindCSS** for the utility-first CSS framework
- **Framer Motion** for smooth animations
- **Lucide** for beautiful icons
- **MongoDB** for the flexible database solution
- **Express.js** for the robust backend framework

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the development team.

---

**Happy Coding! 🚀💻**

























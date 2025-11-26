import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { FollowProvider } from './contexts/FollowContext'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'
import MessagesPage from './pages/MessagesPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
 


function App() {
  return (
    <AuthProvider>
      <FollowProvider>
        <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/users/:id" 
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
 
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      </FollowProvider>
    </AuthProvider>
  )
}

export default App




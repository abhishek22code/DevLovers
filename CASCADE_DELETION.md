# Cascade Deletion System

This document explains how the cascade deletion system works in the DevLovers application.

## Overview

The cascade deletion system ensures that when a user is deleted, all their associated posts are automatically deleted as well. This prevents orphaned posts and maintains data integrity.

## How It Works

### 1. MongoDB Middleware (Automatic)

The system uses MongoDB middleware hooks that automatically trigger when users are deleted:

```javascript
// In server/models/User.js
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const Post = require('./Post');
    await Post.deleteMany({ author: this._id });
    console.log(`Deleted all posts for user ${this._id}`);
    next();
  } catch (error) {
    console.error('Error deleting user posts:', error);
    next(error);
  }
});
```

This middleware triggers for:
- `User.findByIdAndDelete()`
- `User.deleteOne()`
- Direct document deletion

### 2. API Routes (Manual)

The system also provides API endpoints for manual deletion:

#### Self-Deletion (User deletes their own account)
```
DELETE /api/auth/profile
```
- Requires authentication
- Deletes user and all their posts
- Clears authentication token
- Redirects to landing page

#### Admin Deletion (Admin deletes any user)
```
DELETE /api/users/:id
```
- Requires authentication
- Deletes specified user and all their posts
- Returns count of deleted posts

## Testing

### Run the Test Script
```bash
cd server
node test-cascade.js
```

This script will:
1. Create a test user
2. Create 3 test posts for that user
3. Delete the user
4. Verify that all posts were cascade deleted

### Manual Testing
1. Create a user account
2. Create several posts
3. Delete the account using the profile page
4. Verify posts are removed from the database

## Database Operations

### MongoDB Compass
When deleting users directly in MongoDB Compass:
1. The middleware will automatically trigger
2. All posts by that user will be deleted
3. No orphaned posts will remain

### API Calls
When using the application:
1. User clicks "Delete Account" button
2. Confirmation dialog appears
3. API call is made to delete user
4. Middleware automatically deletes posts
5. User is logged out and redirected

## Security Considerations

- Only authenticated users can delete their own accounts
- Admin routes require authentication (consider adding role-based access)
- Confirmation dialogs prevent accidental deletions
- All operations are logged for audit purposes

## Error Handling

- If post deletion fails, user deletion is rolled back
- Comprehensive error logging for debugging
- User-friendly error messages in the UI
- Graceful fallbacks for failed operations

## Performance

- Database indexes on `author` field for fast post queries
- Batch deletion operations for efficiency
- Minimal impact on user experience
- Asynchronous operations where possible

## Future Enhancements

- Role-based access control for admin operations
- Soft deletion (mark as deleted instead of hard delete)
- Recycle bin for deleted content
- Bulk user deletion operations
- Audit trail for all deletion operations



















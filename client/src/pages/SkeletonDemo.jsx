import React from 'react';
import { 
  PostCardSkeleton, 
  PopularPostsSkeleton, 
  ProfileSkeleton, 
  MessagesSkeleton, 
  NavigationSkeleton, 
  CreatePostSkeleton,
  ListSkeleton,
  LoadingSpinner
} from '../components/SkeletonComponents';

const SkeletonDemo = () => {
  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="container mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-base-content mb-4">DaisyUI Skeleton Components Demo</h1>
          <p className="text-lg text-base-content/70">All skeleton loading components implemented throughout the DevLovers app</p>
        </div>

        {/* Navigation Skeleton */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">Navigation Skeleton</h2>
            <NavigationSkeleton />
          </div>
        </div>

        {/* Create Post Skeleton */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">Create Post Skeleton</h2>
            <CreatePostSkeleton />
          </div>
        </div>

        {/* Post Card Skeletons */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">Post Card Skeletons</h2>
            <div className="space-y-4">
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          </div>
        </div>

        {/* Popular Posts Skeleton */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">Popular Posts Skeleton</h2>
            <PopularPostsSkeleton />
          </div>
        </div>

        {/* Profile Skeleton */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">Profile Skeleton</h2>
            <ProfileSkeleton />
          </div>
        </div>

        {/* Messages Skeleton */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">Messages Skeleton</h2>
            <MessagesSkeleton />
          </div>
        </div>

        {/* List Skeleton */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">List Skeleton</h2>
            <ListSkeleton count={5} />
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">Loading Spinners</h2>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <LoadingSpinner size="w-4 h-4" />
                <p className="text-sm mt-2">Small</p>
              </div>
              <div className="text-center">
                <LoadingSpinner size="w-6 h-6" />
                <p className="text-sm mt-2">Medium</p>
              </div>
              <div className="text-center">
                <LoadingSpinner size="w-8 h-8" />
                <p className="text-sm mt-2">Large</p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">Usage Examples</h2>
            <div className="space-y-4">
              <div className="mockup-code">
                <pre><code>{`// Basic skeleton usage
import { PostCardSkeleton } from './components/SkeletonComponents';

// Show skeleton while loading
{loading ? (
  <PostCardSkeleton />
) : (
  <PostCard post={post} />
)}

// Multiple skeletons
{loading ? (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
) : (
  posts.map(post => <PostCard key={post.id} post={post} />)
)}`}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonDemo;


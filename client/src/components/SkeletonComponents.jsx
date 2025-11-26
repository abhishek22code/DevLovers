import React from 'react';

// Base skeleton component
export const Skeleton = ({ className = '', ...props }) => (
  <div className={`skeleton ${className}`} {...props}></div>
);

// Post card skeleton
export const PostCardSkeleton = () => (
  <div className="card bg-base-100 shadow-sm border border-base-300 mb-4">
    <div className="card-body p-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-6 h-6" />
      </div>

      {/* Content skeleton */}
      <div className="mb-4">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Actions skeleton */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  </div>
);

// Popular posts skeleton
export const PopularPostsSkeleton = () => (
  <div className="card bg-base-100 shadow-sm border border-base-300">
    <div className="card-body p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8" />
          <div>
            <Skeleton className="h-5 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="w-6 h-6" />
      </div>

      {/* Posts list skeleton */}
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-base-200">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="mt-4 pt-4 border-t border-base-300">
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-3 w-32 mx-auto" />
      </div>
    </div>
  </div>
);

// Profile skeleton
export const ProfileSkeleton = () => (
  <div className="card bg-base-100 shadow-sm border border-base-300">
    <div className="card-body p-6">
      {/* Profile header skeleton */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div className="flex-1 text-center md:text-left">
          <Skeleton className="h-6 w-32 mb-2 mx-auto md:mx-0" />
          <Skeleton className="h-4 w-24 mb-1 mx-auto md:mx-0" />
          <Skeleton className="h-3 w-20 mx-auto md:mx-0" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Profile stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      </div>

      {/* Bio skeleton */}
      <div className="mb-6">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Skills/Tags skeleton */}
      <div className="flex flex-wrap gap-2">
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} className="h-6 w-16 rounded-full" />
        ))}
      </div>
    </div>
  </div>
);

// Navigation skeleton
export const NavigationSkeleton = () => (
  <div className="navbar bg-base-100 border-b border-base-300">
    <div className="navbar-start">
      <Skeleton className="h-8 w-32" />
    </div>
    <div className="navbar-center">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
    <div className="navbar-end">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-6 w-6" />
      </div>
    </div>
  </div>
);

// Messages skeleton
export const MessagesSkeleton = () => (
  <div className="flex h-full">
    {/* Sidebar skeleton */}
    <div className="w-1/3 border-r border-base-300 p-4">
      <div className="mb-4">
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-6 w-3/4" />
      </div>
      
      <div className="space-y-2">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="w-2 h-2 rounded-full" />
          </div>
        ))}
      </div>
    </div>

    {/* Chat area skeleton */}
    <div className="flex-1 flex flex-col">
      {/* Chat header skeleton */}
      <div className="border-b border-base-300 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className={`flex ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs ${index % 2 === 0 ? 'bg-primary text-primary-content' : 'bg-base-200'} rounded-lg p-3`}>
              <Skeleton className={`h-4 w-32 ${index % 2 === 0 ? 'bg-primary-content/20' : 'bg-base-300'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Message input skeleton */}
      <div className="border-t border-base-300 p-4">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>
    </div>
  </div>
);

// Create post skeleton
export const CreatePostSkeleton = () => (
  <div className="card bg-base-100 shadow-sm border border-base-300 mb-4">
    <div className="card-body p-4">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      <div className="mb-4">
        <Skeleton className="h-20 w-full mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  </div>
);

// General list skeleton
export const ListSkeleton = ({ count = 3, itemHeight = 'h-16' }) => (
  <div className="space-y-2">
    {[...Array(count)].map((_, index) => (
      <div key={index} className={`${itemHeight} bg-base-200 rounded-lg animate-pulse`}>
        <div className="flex items-center gap-3 h-full p-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="w-6 h-6" />
        </div>
      </div>
    ))}
  </div>
);

// Loading spinner component
export const LoadingSpinner = ({ size = 'w-6 h-6', className = '' }) => (
  <div className={`loading loading-spinner ${size} ${className}`}></div>
);

export default Skeleton;

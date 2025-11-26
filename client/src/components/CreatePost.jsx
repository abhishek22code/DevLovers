import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Send, Image as ImageIcon, Tag } from 'lucide-react';
import { CreatePostSkeleton } from './SkeletonComponents';
import axios from 'axios';
import styles from '../styles/CreatePost.module.css';

const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('text'); // 'text' | 'code'
  const [language, setLanguage] = useState('cpp'); // for code posts
  const [sourceCode, setSourceCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [image, setImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);
  const featureCodePosts = import.meta.env.VITE_FEATURE_CODE_POSTS === 'true';

  // Show skeleton loading while auth is loading
  if (authLoading || !user) {
    return <CreatePostSkeleton />;
  }

  // Function to get default profile picture based on gender
  const getDefaultProfilePicture = (user) => {
    if (!user) return 'https://via.placeholder.com/40/6366f1/ffffff?text=DL';
    
    const gender = user.gender;
    if (gender === 'male') {
      return 'https://via.placeholder.com/40/3b82f6/ffffff?text=👨';
    } else if (gender === 'female') {
      return 'https://via.placeholder.com/40/ec4899/ffffff?text=👩';
    } else {
      return 'https://via.placeholder.com/40/6366f1/ffffff?text=👤';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    if (featureCodePosts && postType === 'code' && !sourceCode.trim()) return;
    if (imageLoading) return; // wait for image to finish reading
    
    setIsSubmitting(true);
    
    try {
      const postData = {
        content: content.trim(),
        image: image || null,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        type: featureCodePosts ? postType : 'text',
        ...(featureCodePosts && postType === 'code' ? {
          code: {
            language,
            sourceCode: sourceCode,
            stdin: stdin
          }
        } : {})
      };
      // Optimistic post for instant UI
      const tempId = `temp-${Date.now()}`;
      const optimisticPost = {
        _id: tempId,
        author: {
          _id: user?._id,
          username: user?.username,
          profilePicture: user?.profilePicture,
        },
        content: postData.content,
        image: postData.image,
        tags: postData.tags,
        type: postData.type,
        code: postData.code,
        likes: [],
        comments: [],
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
      };
      onPostCreated(optimisticPost, { optimistic: true });

      // Ensure token is included in the request
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/posts', postData, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined
        }
      });
      const apiPost = response?.data?.post || response?.data || null;
      if (apiPost) {
        const normalizedAuthor = (() => {
          if (apiPost.author && typeof apiPost.author === 'object') return apiPost.author;
          if (apiPost.author && typeof apiPost.author === 'string') {
            return {
              _id: apiPost.author,
              username: user?.username,
              profilePicture: user?.profilePicture,
            };
          }
          return {
            _id: user?._id,
            username: user?.username,
            profilePicture: user?.profilePicture,
          };
        })();
        // Preserve image if server response omitted it (safety fallback)
        const authoredPost = { 
          ...apiPost, 
          author: normalizedAuthor,
          image: apiPost.image ?? optimisticPost.image ?? postData.image ?? null
        };
        onPostCreated(authoredPost, { replaceTempId: tempId });
        try {
          const key = 'dl_pending_posts';
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const next = Array.isArray(existing) ? [...existing, authoredPost] : [authoredPost];
          localStorage.setItem(key, JSON.stringify(next));
        } catch (e) {
          console.error('Failed to buffer pending posts', e);
        }
      }
      
      // Reset form and clear file input
      setContent('');
      setImage(null);
      setTags('');
      setPostType('text');
      setLanguage('cpp');
      setSourceCode('');
      setStdin('');
      if (fileInputRef.current) {
        try { fileInputRef.current.value = ''; } catch (e) {
          // File input may not be available
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
      
      // Extract error message
      let errorMessage = 'Failed to create post. Please try again.';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Show error to user
      setError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
      
      // Rollback optimistic post
      try {
        onPostCreated({ _id: null }, { rollbackOptimistic: true });
      } catch (e) {
        // Rollback may fail if component unmounted
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Reject very large files to avoid server/Mongo limits
      const maxBytes = 8 * 1024 * 1024; // 8MB
      if (file.size > maxBytes) {
        alert('Image is too large. Please choose an image under 8MB.');
        try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch (e) {
          // File input may not be available
        }
        return;
      }
      setImageLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setImageLoading(false);
      };
      reader.onerror = () => {
        console.error('Failed to read image file');
        setImageLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={styles.container}
    >
      <div className={styles.header}>
        <img
          src={user?.profilePicture || getDefaultProfilePicture(user)}
          alt={user?.username}
          className={styles.userImage}
          onError={(e) => {
            e.target.src = getDefaultProfilePicture(user);
          }}
        />
        <div className={styles.userInfo}>
          <p className={styles.username}>{user?.username}</p>
          <p className={styles.subtitle}>Share something amazing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage} style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        
        {/* Post Type Selector (hidden unless enabled) */}
        {featureCodePosts && (
          <div className={styles.typeRow}>
            <div className={styles.typeToggle}>
              <label>
                <input
                  type="radio"
                  name="postType"
                  value="text"
                  checked={postType === 'text'}
                  onChange={() => setPostType('text')}
                />
                <span>Text</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="postType"
                  value="code"
                  checked={postType === 'code'}
                  onChange={() => setPostType('code')}
                />
                <span>Code</span>
              </label>
            </div>
            {postType === 'code' && (
              <div className={styles.langSelectWrap}>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={styles.langSelect}
                >
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </select>
              </div>
            )}
          </div>
        )}
        <div className={styles.contentGroup}>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null); // Clear error when user starts typing
            }}
            placeholder={postType === 'code' ? 'Add a description for your code (required)' : "What's on your mind, developer?"}
            className={styles.textarea}
            rows="4"
            maxLength="1000"
          />
          <div className={styles.characterCount}>
            <span className={styles.characterText}>
              {content.length}/1000 characters
            </span>
          </div>
        </div>

        {/* Code Editor (simple textarea) */}
        {featureCodePosts && postType === 'code' && (
          <div className={styles.codeSection}>
            <label className={styles.codeLabel}>Source code ({language === 'cpp' ? 'C++17' : 'Java'})</label>
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              placeholder={language === 'java' ? 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}' : '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  cout << "Hello";\n  return 0;\n}'}
              className={styles.codeTextarea}
              rows="10"
              maxLength="200000"
            />
            <label className={styles.stdinLabel}>Optional input (stdin)</label>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Input passed to your program"
              className={styles.stdinTextarea}
              rows="3"
              maxLength="50000"
            />
          </div>
        )}

        {/* Image Upload */}
        <div className={styles.imageSection}>
          <label className={styles.imageLabel}>
            <ImageIcon className={styles.imageIcon} />
            <span>Add Image (Optional)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.imageInput}
            />
          </label>
          
          {image && (
            <div className={styles.imagePreview}>
              <img
                src={image}
                alt="Preview"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={removeImage}
                className={styles.imageRemove}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className={styles.tagsSection}>
          <label className={styles.tagsLabel}>
            <Tag className={styles.tagsIcon} />
            <span>Tags (Optional)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="JavaScript, React, Node.js..."
            className={styles.tagsInput}
          />
          <p className={styles.tagsHelp}>
            Separate tags with commas
          </p>
        </div>

        <motion.button
          type="submit"
          disabled={!content.trim() || (postType === 'code' && !sourceCode.trim()) || isSubmitting || imageLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={styles.submitButton}
        >
          {isSubmitting ? (
            <>
              <div className="loading loading-spinner loading-xs"></div>
              <span>Posting...</span>
            </>
          ) : (
            <>
              <Send className={styles.submitIcon} />
              <span>{imageLoading ? 'Processing image...' : 'Share Post'}</span>
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default CreatePost;




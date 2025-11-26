import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, Send, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/VerificationRequestModal.module.css';

const VerificationRequestModal = ({ isOpen, onClose, username }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const feedbackTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setFeedbackMessage('');
      setErrorMessage('');
      setIsSubmitting(false);
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setFeedbackMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/users/verification/request',
        { body: reason.trim() },
        {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        }
      );

      if (response.data) {
        setFeedbackMessage(response.data.message || 'Request sent successfully! Our team will review it shortly.');
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
          onClose();
          setReason('');
          setFeedbackMessage('');
          setErrorMessage('');
          setIsSubmitting(false);
          feedbackTimeoutRef.current = null;
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending verification request:', error);
      setErrorMessage(
        error.response?.data?.message || 
        'Failed to send verification request. Please try again later.'
      );
      setIsSubmitting(false);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    }
  };

return (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <ShieldCheck className={styles.headerIcon} />
              <div>
                <p className={styles.title}>Request Verification</p>
                <p className={styles.subtitle}>
                  Tell us why {username ? `@${username}` : 'this account'} should be verified.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close verification request modal"
            >
              <X className={styles.closeIcon} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="verification-reason" className={styles.label}>
              Your message
            </label>
            <textarea
              id="verification-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Highlight your contributions, credentials, or other reasons for verification..."
              className={styles.textarea}
              rows="5"
              maxLength={500}
            />
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={!!feedbackMessage}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={!reason.trim() || !!feedbackMessage || isSubmitting}
              >
                <Send className={styles.submitIcon} />
                {isSubmitting ? 'Sending...' : feedbackMessage ? 'Request Sent' : 'Send Request'}
              </button>
            </div>
            {errorMessage && (
              <p className={styles.errorMessage} role="alert" aria-live="polite">
                {errorMessage}
              </p>
            )}
            {feedbackMessage && (
              <p className={styles.successMessage} role="status" aria-live="polite">
                {feedbackMessage}
              </p>
            )}
          </form>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
};

export default VerificationRequestModal;


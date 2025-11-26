import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import styles from '../styles/LandingPage.module.css';

const LandingPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [inOtpStep, setInOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    bio: '',
    gender: 'prefer-not-to-say'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();
  const { login, signup, verifyOtp, error, clearError } = useAuth();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        const userData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          bio: formData.bio,
          gender: formData.gender
        };
        result = await signup(userData);
      }

      if (result?.success) {
        if (isLogin) {
          navigate('/home');
        } else {
          if (result?.requiresVerification) {
            setPendingEmail(formData.email);
            setInOtpStep(true);
            setSuccessMessage('OTP sent to your registered email.');
          } else {
            setFormData({
              username: '',
              email: '',
              password: '',
              bio: '',
              gender: 'prefer-not-to-say'
            });
            setIsLogin(true);
            setSuccessMessage('Account created successfully! Please sign in with your credentials.');
            clearError();
          }
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={`${styles.card} ${!isLogin ? styles.cardExpanded : ''}`}>
        <div className={styles.leftPane}>
          <div className={styles.brand}>DevLovers</div>
          <div className={styles.leftContent}>
            <p className={styles.kicker}>Connect • Share • Build</p>
            <h2 className={styles.headline}>Join the community that loves coding as much as you do.</h2>
          </div>
        </div>

        <div className={`${styles.rightPane} ${error && isLogin ? styles.error : ''}`}>
          <div className={styles.asterisk}>*</div>
          <h1 className={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className={styles.subtitle}>
            {isLogin ? 'Sign in to your account' : 'Start your journey in seconds'}
          </p>

          {error && (
            <div className={styles.formError}>{error}</div>
          )}
          {successMessage && (
            <div className={styles.formSuccess}>{successMessage}</div>
          )}

          {!inOtpStep ? (
            <form onSubmit={handleSubmit} className={styles.formGrid}>
              {!isLogin && (
                <>
                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      <option value="prefer-not-to-say">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}

              <div className={styles.fieldRow}>
                <label className={styles.label}>Your email</label>
                <div className={styles.inputWrap}>
                  <Mail className={styles.inputIcon} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="abhishek@dev.com"
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.label}>{isLogin ? 'Password' : 'Create password'}</label>
                <div className={styles.inputWrap}>
                  <Lock className={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className={styles.fieldRow}>
                  <label className={styles.label}>Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className={styles.textarea}
                    rows="3"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className={styles.primaryBtn}>
                {isSubmitting ? (
                  <div className={styles.loadingContent}>
                    <div className={styles.spinner}></div>
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </div>
                ) : (
                  isLogin ? 'Sign in' : 'Create account'
                )}
              </button>
            </form>
          ) : (
            <div className={styles.formGrid}>
              <h3 className={styles.title} style={{ marginTop: '0.5rem' }}>Verify Email</h3>
              <p className={styles.subtitle}>OTP sent to {pendingEmail}. Enter the 6-digit code below.</p>
              <div className={styles.fieldRow}>
                <label className={styles.label}>One-Time Password</label>
                <div className={styles.inputWrap}>
                  <Shield className={styles.inputIcon} />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className={styles.input}
                    placeholder="Enter 6-digit code"
                  />
                </div>
              </div>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={isVerifying || otpCode.length !== 6}
                onClick={async () => {
                  setIsVerifying(true);
                  const res = await verifyOtp(pendingEmail, otpCode);
                  if (res?.success) {
                    const loginRes = await login(formData.email, formData.password);
                    if (loginRes?.success) {
                      navigate('/home');
                    }
                  }
                  setIsVerifying(false);
                }}
                style={{ marginTop: '0.5rem' }}
              >
                {isVerifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          )}

          {/* OTP modal removed; OTP is now inline replacing the form */}

          <div className={styles.switchRow}>
            {isLogin ? 'Don\'t have an account? ' : 'Already have an account? '}
            {!inOtpStep && (
            <button
              type="button"
              className={styles.switchLink}
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({
                  username: '',
                  email: '',
                  password: '',
                  bio: '',
                  gender: 'prefer-not-to-say'
                });
                setSuccessMessage('');
                clearError();
              }}
            >
              {isLogin ? 'Register' : 'Sign in'}
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

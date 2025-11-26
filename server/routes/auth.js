const express = require('express');
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Controller-based routes

router.post('/signup', authController.signup);

router.post('/login', authController.login);

router.get('/me', auth, authController.me);

router.get('/check', auth, authController.me);

router.put('/profile', auth, authController.updateProfile);

router.delete('/profile', auth, authController.deleteProfile);

router.post('/logout', auth, authController.logout);

router.post('/verify-otp', authController.verifyOtp);

module.exports = router;


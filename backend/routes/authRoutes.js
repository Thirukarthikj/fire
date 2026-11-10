const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../middleware/validator');

router.post('/register', authLimiter, validateRegistration, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/logout', isAuthenticated, authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.get('/me', isAuthenticated, authController.getMe);

module.exports = router;


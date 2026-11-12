const User = require('../models/User');
const mongoose = require('mongoose');
const { sanitizeUser } = require('../utils/helpers');
const { DEMO_USERS } = require('../data/fallbackData');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (mongoose.connection.readyState !== 1) {
      const demoUser = {
        _id: 'usr_' + Date.now(),
        name,
        email: cleanEmail,
        password,
        phone: phone || '+91 98765 00000',
        role: 'customer',
        isActive: true,
        addresses: []
      };
      DEMO_USERS.push(demoUser);
      req.session.userId = demoUser._id;
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: sanitizeUser(demoUser),
        isDemo: true
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const user = await User.create({
      name,
      email: cleanEmail,
      password,
      phone,
      role: 'customer'
    });

    req.session.userId = user._id;

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    // If database is offline or unconfigured on Vercel, allow seeded demo login
    if (mongoose.connection.readyState !== 1) {
      const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);
      if (demoUser && password === demoUser.password) {
        req.session.userId = demoUser._id;
        return res.status(200).json({
          success: true,
          message: 'Logged in successfully (Demo Session)',
          data: sanitizeUser(demoUser),
          isDemo: true
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Demo account: customer@example.com / Password@123'
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);
      if (demoUser && password === demoUser.password) {
        req.session.userId = demoUser._id;
        return res.status(200).json({
          success: true,
          message: 'Logged in successfully (Demo Session)',
          data: sanitizeUser(demoUser),
          isDemo: true
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check account lock
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${waitMinutes} minute(s).`
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }
      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Reset attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    req.session.userId = user._id;

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: sanitizeUser(user)
    });
  } catch (error) {
    const cleanEmail = req.body && req.body.email ? req.body.email.trim().toLowerCase() : '';
    const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (demoUser && req.body.password === demoUser.password) {
      req.session.userId = demoUser._id;
      return res.status(200).json({
        success: true,
        message: 'Logged in successfully (Demo Session)',
        data: sanitizeUser(demoUser),
        isDemo: true
      });
    }
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email ? email.toLowerCase() : '' });

    if (!user) {
      // Return success anyway to avoid user enumeration
      return res.status(200).json({
        success: true,
        message: 'If that email address exists, a password reset token has been generated.'
      });
    }

    const resetToken = user.generateResetToken();
    await user.save();

    console.log(`[DEV ONLY] Password reset token for ${user.email}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'Password reset token generated. In a live system, this is sent via email.',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in.'
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    if (req.user) {
      return res.status(200).json({
        success: true,
        data: sanitizeUser(req.user)
      });
    }

    const effectiveUserId = (req.session && req.session.userId) || req.headers['x-user-id'];
    if (effectiveUserId) {
      const demo = DEMO_USERS.find(u => u._id === effectiveUserId);
      if (demo) {
        return res.status(200).json({
          success: true,
          data: sanitizeUser(demo)
        });
      }
    }

    res.status(401).json({ success: false, message: 'Not authenticated' });
  } catch (error) {
    next(error);
  }
};


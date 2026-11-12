const User = require('../models/User');
const mongoose = require('mongoose');
const { DEMO_USERS } = require('../data/fallbackData');

const isAuthenticated = async (req, res, next) => {
  try {
    const headerUserId = req.headers['x-user-id'];
    if ((!req.session || !req.session.userId) && headerUserId) {
      if (req.session) req.session.userId = headerUserId;
    }

    const effectiveUserId = (req.session && req.session.userId) || headerUserId;
    if (!effectiveUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId);
      if (demoUser && demoUser.isActive) {
        req.user = demoUser;
        return next();
      }
      return res.status(401).json({
        success: false,
        message: 'Account not found. Please log in again.'
      });
    }

    let user = null;
    try {
      user = await User.findById(effectiveUserId);
    } catch (e) {}

    if (!user || !user.isActive) {
      const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId);
      if (demoUser && demoUser.isActive) {
        req.user = demoUser;
        return next();
      }
      if (req.session) req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'Account not found or inactive. Please log in again.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    const effectiveUserId = (req.session && req.session.userId) || req.headers['x-user-id'];
    const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId);
    if (demoUser && demoUser.isActive) {
      req.user = demoUser;
      return next();
    }
    next(error);
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const headerUserId = req.headers['x-user-id'];
    if ((!req.session || !req.session.userId) && headerUserId) {
      if (req.session) req.session.userId = headerUserId;
    }

    const effectiveUserId = (req.session && req.session.userId) || headerUserId;
    if (!effectiveUserId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required.'
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId && (u.role === 'admin' || u.role === 'superadmin'));
      if (demoUser && demoUser.isActive) {
        req.user = demoUser;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required.'
      });
    }

    let user = null;
    try {
      user = await User.findById(effectiveUserId);
    } catch (e) {}

    if (!user || !user.isActive) {
      const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId && (u.role === 'admin' || u.role === 'superadmin'));
      if (demoUser && demoUser.isActive) {
        req.user = demoUser;
        return next();
      }
      if (req.session) req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'Account not found or deactivated.'
      });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    const effectiveUserId = (req.session && req.session.userId) || req.headers['x-user-id'];
    const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId && (u.role === 'admin' || u.role === 'superadmin'));
    if (demoUser && demoUser.isActive) {
      req.user = demoUser;
      return next();
    }
    next(error);
  }
};

const isSuperAdmin = async (req, res, next) => {
  try {
    const headerUserId = req.headers['x-user-id'];
    if ((!req.session || !req.session.userId) && headerUserId) {
      if (req.session) req.session.userId = headerUserId;
    }

    const effectiveUserId = (req.session && req.session.userId) || headerUserId;
    if (!effectiveUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId && u.role === 'superadmin');
      if (demoUser && demoUser.isActive) {
        req.user = demoUser;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied: Super Administrator privileges required.'
      });
    }

    let user = null;
    try {
      user = await User.findById(effectiveUserId);
    } catch (e) {}

    if (!user || !user.isActive || user.role !== 'superadmin') {
      const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId && u.role === 'superadmin');
      if (demoUser && demoUser.isActive) {
        req.user = demoUser;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied: Super Administrator privileges required.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    const effectiveUserId = (req.session && req.session.userId) || req.headers['x-user-id'];
    const demoUser = DEMO_USERS.find(u => u._id === effectiveUserId && u.role === 'superadmin');
    if (demoUser && demoUser.isActive) {
      req.user = demoUser;
      return next();
    }
    next(error);
  }
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isSuperAdmin
};

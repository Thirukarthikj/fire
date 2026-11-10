const User = require('../models/User');

const isAuthenticated = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'Account not found or inactive. Please log in again.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required.'
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy();
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
    next(error);
  }
};

const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Super Administrator privileges required.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isSuperAdmin
};


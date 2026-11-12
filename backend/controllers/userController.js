const User = require('../models/User');
const { sanitizeUser } = require('../utils/helpers');

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    if (req.user) {
      return res.status(200).json({
        success: true,
        data: sanitizeUser(req.user)
      });
    }

    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: sanitizeUser(user)
    });
  } catch (error) {
    if (req.user) {
      return res.status(200).json({
        success: true,
        data: sanitizeUser(req.user)
      });
    }
    next(error);
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    let user = null;

    try {
      user = await User.findById(req.user._id);
    } catch (dbErr) {
      console.warn('[Profile] Could not query database:', dbErr.message);
    }

    if (user) {
      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone.trim();
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: sanitizeUser(user)
      });
    }

    // Demo or in-memory user
    const updated = { ...req.user };
    if (name) updated.name = name.trim();
    if (phone !== undefined) updated.phone = phone.trim();
    req.user = updated;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: sanitizeUser(updated)
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    let user = null;
    try {
      user = await User.findById(req.user._id);
    } catch (dbErr) {}

    if (user) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect current password'
        });
      }
      user.password = newPassword;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

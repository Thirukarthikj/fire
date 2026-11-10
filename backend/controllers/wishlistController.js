const User = require('../models/User');
const Product = require('../models/Product');

// GET /api/wishlist - Get all wishlisted products for logged-in user
exports.getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      select: 'name slug sku price comparePrice discount images stock category brand isActive',
      populate: { path: 'category', select: 'name slug' }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const validProducts = (user.wishlist || []).filter(p => p && p.isActive !== false);

    res.status(200).json({
      success: true,
      data: validProducts,
      count: validProducts.length
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/wishlist/toggle - Toggle a product in user's wishlist in MongoDB
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user.wishlist) user.wishlist = [];

    const index = user.wishlist.findIndex(id => id.toString() === productId.toString());
    let isAdded = false;

    if (index > -1) {
      user.wishlist.splice(index, 1);
      isAdded = false;
    } else {
      user.wishlist.push(productId);
      isAdded = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      isAdded,
      message: isAdded ? 'Added to wishlist' : 'Removed from wishlist',
      count: user.wishlist.length,
      wishlist: user.wishlist
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/wishlist/sync - Sync local wishlist array to MongoDB
exports.syncWishlist = async (req, res, next) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(200).json({ success: true, message: 'No items to sync' });
    }

    const user = await User.findById(req.user._id);
    if (!user.wishlist) user.wishlist = [];

    const existingSet = new Set(user.wishlist.map(id => id.toString()));

    for (const pid of productIds) {
      if (pid && !existingSet.has(pid.toString())) {
        existingSet.add(pid.toString());
        user.wishlist.push(pid);
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Wishlist synced successfully with MongoDB',
      count: user.wishlist.length,
      wishlist: user.wishlist
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/wishlist/:productId - Remove specific item from MongoDB wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user.wishlist) user.wishlist = [];

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId.toString());
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Removed from wishlist in MongoDB',
      count: user.wishlist.length
    });
  } catch (error) {
    next(error);
  }
};

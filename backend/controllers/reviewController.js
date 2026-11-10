const Review = require('../models/Review');
const Product = require('../models/Product');

// GET /api/reviews/product/:productId
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product: productId, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(50);

    const count = reviews.length;
    const avgRating = count > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)
      : '5.0';

    res.status(200).json({
      success: true,
      data: reviews,
      count,
      averageRating: parseFloat(avgRating)
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/reviews
exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, title, comment, userName, userLocation } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating (1-5), and review comment are required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const reviewerName = (req.user && req.user.name) || userName || 'Verified Festive Buyer';

    const review = await Review.create({
      product: productId,
      user: req.user ? req.user._id : undefined,
      userName: reviewerName,
      userLocation: userLocation || 'India',
      rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
      title: (title || 'Festive Quality Rating').trim(),
      comment: comment.trim(),
      verifiedPurchase: true,
      status: 'approved'
    });

    res.status(201).json({
      success: true,
      message: 'Review stored in MongoDB successfully',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

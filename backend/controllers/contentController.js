const SiteContent = require('../models/SiteContent');
const Category = require('../models/Category');
const Product = require('../models/Product');

// GET /api/content/home
exports.getHomeContent = async (req, res, next) => {
  try {
    const banners = await SiteContent.find({ type: 'banner', isActive: true }).sort({ displayOrder: 1 });
    const announcements = await SiteContent.find({ type: 'announcement', isActive: true }).sort({ displayOrder: 1 });
    const featuredCategories = await Category.find({ isActive: true }).sort({ displayOrder: 1 }).limit(6);
    const featuredProducts = await Product.find({ isActive: true, isFeatured: true }).populate('category', 'name slug').limit(8);
    const newArrivals = await Product.find({ isActive: true, isNewArrival: true }).populate('category', 'name slug').limit(8);
    const bestSellers = await Product.find({ isActive: true, $or: [{ isBestSeller: true }, { sold: { $gt: 0 } }] }).populate('category', 'name slug').limit(8);

    res.status(200).json({
      success: true,
      data: {
        banners,
        announcements,
        featuredCategories,
        featuredProducts,
        newArrivals,
        bestSellers
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/content/banners
exports.getBanners = async (req, res, next) => {
  try {
    const banners = await SiteContent.find({ type: 'banner', isActive: true }).sort({ displayOrder: 1 });
    res.status(200).json({
      success: true,
      data: banners
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/content/faqs
exports.getFaqs = async (req, res, next) => {
  try {
    const faqs = await SiteContent.find({ type: 'faq', isActive: true }).sort({ displayOrder: 1 });
    res.status(200).json({
      success: true,
      data: faqs
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/content/policies/:type
exports.getPolicy = async (req, res, next) => {
  try {
    const { type } = req.params;
    const policy = await SiteContent.findOne({
      $or: [
        { type: 'policy', 'metadata.policyType': type },
        { type, isActive: true },
        { title: new RegExp(type, 'i'), type: 'policy' }
      ]
    });

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    res.status(200).json({
      success: true,
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/content/contact
exports.getContact = async (req, res, next) => {
  try {
    const contact = await SiteContent.findOne({ type: 'contact' });
    res.status(200).json({
      success: true,
      data: contact || {
        title: 'Customer Care & Support',
        content: 'We are here to assist with safety tips, orders, and inquiries.',
        metadata: {
          email: 'support@firecrackers-store.com',
          phone: '+91 98765 43210',
          address: 'Fireworks Industrial Estate, Sivakasi, Tamil Nadu 626123, India',
          hours: 'Mon - Sat: 9:00 AM - 7:00 PM IST'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};


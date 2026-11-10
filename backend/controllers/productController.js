const Product = require('../models/Product');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const { FALLBACK_PRODUCTS } = require('../data/fallbackData');

// Helper to filter and paginate fallback catalogue when DB is disconnected
const serveFallbackProducts = (req, res, page, limit) => {
  let filtered = [...FALLBACK_PRODUCTS];

  if (req.query.category) {
    const cat = req.query.category.toLowerCase();
    filtered = filtered.filter(p => p.category.slug.toLowerCase() === cat || p.category._id === cat);
  }

  if (req.query.search && req.query.search.trim()) {
    const term = req.query.search.trim().toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term));
  }

  if (req.query.brand && req.query.brand.trim()) {
    const brandTerm = req.query.brand.trim().toLowerCase();
    filtered = filtered.filter(p => p.brand.toLowerCase() === brandTerm);
  }

  if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
    filtered = filtered.filter(p => p.price >= Number(req.query.minPrice));
  }
  if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
    filtered = filtered.filter(p => p.price <= Number(req.query.maxPrice));
  }

  if (req.query.sort === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (req.query.sort === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (req.query.sort === 'popular') {
    filtered.sort((a, b) => b.sold - a.sold);
  }

  const total = filtered.length;
  const skip = (page - 1) * limit;
  const paginated = filtered.slice(skip, skip + limit);

  return res.status(200).json({
    success: true,
    data: paginated,
    fallback: true,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

// GET /api/products
// Query params: page, limit, category, search, sort, minPrice, maxPrice, featured
exports.getProducts = async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  // If database is not connected, serve fallback catalogue immediately with 0ms delay
  if (mongoose.connection.readyState !== 1) {
    return serveFallbackProducts(req, res, page, limit);
  }

  try {
    const query = { isActive: true };

    // Category filter (by slug or id)
    if (req.query.category) {
      if (req.query.category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = req.query.category;
      } else {
        const cat = await Category.findOne({ slug: req.query.category, isActive: true });
        if (cat) {
          query.category = cat._id;
        } else {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, pages: 0 }
          });
        }
      }
    }

    // Search filter
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { sku: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Price range filter
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      query.price = {};
      if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
        query.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
        query.price.$lte = Number(req.query.maxPrice);
      }
    }

    // Brand filter
    if (req.query.brand && req.query.brand.trim()) {
      query.brand = new RegExp('^' + req.query.brand.trim() + '$', 'i');
    }

    // Availability filter
    if (req.query.inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price_asc':
          sort = { price: 1 };
          break;
        case 'price_desc':
          sort = { price: -1 };
          break;
        case 'popular':
        case 'best_selling':
          sort = { sold: -1, createdAt: -1 };
          break;
        case 'name_asc':
          sort = { name: 1 };
          break;
        case 'newest':
        default:
          sort = { createdAt: -1 };
          break;
      }
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.warn('[Products] Database query fallback triggered:', error.message);
    return serveFallbackProducts(req, res, page, limit);
  }
};

// GET /api/products/featured
exports.getFeaturedProducts = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    const featured = FALLBACK_PRODUCTS.filter(p => p.isFeatured).slice(0, 8);
    return res.status(200).json({ success: true, data: featured, fallback: true });
  }

  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate('category', 'name slug')
      .limit(8)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    const featured = FALLBACK_PRODUCTS.filter(p => p.isFeatured).slice(0, 8);
    res.status(200).json({ success: true, data: featured, fallback: true });
  }
};

// GET /api/products/new-arrivals
exports.getNewArrivals = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    const newItems = FALLBACK_PRODUCTS.filter(p => p.isNewArrival).slice(0, 8);
    return res.status(200).json({ success: true, data: newItems, fallback: true });
  }

  try {
    const products = await Product.find({ isActive: true, isNewArrival: true })
      .populate('category', 'name slug')
      .limit(8)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    const newItems = FALLBACK_PRODUCTS.filter(p => p.isNewArrival).slice(0, 8);
    res.status(200).json({ success: true, data: newItems, fallback: true });
  }
};

// GET /api/products/best-sellers
exports.getBestSellers = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    const best = FALLBACK_PRODUCTS.filter(p => p.isBestSeller).slice(0, 8);
    return res.status(200).json({ success: true, data: best, fallback: true });
  }

  try {
    const products = await Product.find({ isActive: true, $or: [{ isBestSeller: true }, { sold: { $gt: 0 } }] })
      .populate('category', 'name slug')
      .limit(8)
      .sort({ sold: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    const best = FALLBACK_PRODUCTS.filter(p => p.isBestSeller).slice(0, 8);
    res.status(200).json({ success: true, data: best, fallback: true });
  }
};

// GET /api/products/:idOrSlug
exports.getProductByIdOrSlug = async (req, res, next) => {
  const { id } = req.params;

  if (mongoose.connection.readyState !== 1) {
    const product = FALLBACK_PRODUCTS.find(p => p.slug === id || p._id === id);
    if (product) return res.status(200).json({ success: true, data: product, fallback: true });
  }

  try {
    let query;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: id, isActive: true };
    } else {
      query = { slug: id, isActive: true };
    }

    const product = await Product.findOne(query).populate('category', 'name slug');
    if (!product) {
      const fallback = FALLBACK_PRODUCTS.find(p => p.slug === id || p._id === id);
      if (fallback) return res.status(200).json({ success: true, data: fallback, fallback: true });

      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    const fallback = FALLBACK_PRODUCTS.find(p => p.slug === id || p._id === id);
    if (fallback) return res.status(200).json({ success: true, data: fallback, fallback: true });
    next(error);
  }
};

// GET /api/products/:id/related
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    let categoryId = null;

    if (mongoose.connection.readyState === 1) {
      const product = await Product.findById(id).select('category');
      if (product) categoryId = product.category;
    }

    if (!categoryId) {
      const related = FALLBACK_PRODUCTS.slice(0, 4);
      return res.status(200).json({ success: true, data: related, fallback: true });
    }

    const related = await Product.find({
      _id: { $ne: id },
      category: categoryId,
      isActive: true
    }).limit(4);

    res.status(200).json({
      success: true,
      data: related
    });
  } catch (error) {
    const related = FALLBACK_PRODUCTS.slice(0, 4);
    res.status(200).json({ success: true, data: related, fallback: true });
  }
};

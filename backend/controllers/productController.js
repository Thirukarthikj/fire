const Product = require('../models/Product');
const Category = require('../models/Category');

// GET /api/products
// Query params: page, limit, category, search, sort, minPrice, maxPrice, featured
exports.getProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

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
    next(error);
  }
};

// GET /api/products/featured
exports.getFeaturedProducts = async (req, res, next) => {
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
    next(error);
  }
};

// GET /api/products/new-arrivals
exports.getNewArrivals = async (req, res, next) => {
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
    next(error);
  }
};

// GET /api/products/best-sellers
exports.getBestSellers = async (req, res, next) => {
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
    next(error);
  }
};

// GET /api/products/:idOrSlug
exports.getProductByIdOrSlug = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: id, isActive: true };
    } else {
      query = { slug: id, isActive: true };
    }

    const product = await Product.findOne(query).populate('category', 'name slug');
    if (!product) {
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
    next(error);
  }
};

// GET /api/products/:id/related
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
      .populate('category', 'name slug')
      .limit(4);

    res.status(200).json({
      success: true,
      data: related
    });
  } catch (error) {
    next(error);
  }
};


const Category = require('../models/Category');
const Product = require('../models/Product');

// GET /api/categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });

    // Update product counts dynamically if needed
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/categories/:idOrSlug
exports.getCategoryByIdOrSlug = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: id, isActive: true };
    } else {
      query = { slug: id, isActive: true };
    }

    const category = await Category.findOne(query);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/categories/:id/products
exports.getCategoryProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    let category;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(id);
    } else {
      category = await Category.findOne({ slug: id });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const query = { category: category._id, isActive: true };
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: products,
      category,
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


const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const AuditLog = require('../models/AuditLog');
const { adjustStock } = require('../services/inventoryService');

// GET /api/admin/inventory
exports.getInventory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status === 'low') {
      query.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
      query.stock = { $gt: 0 };
    } else if (req.query.status === 'out') {
      query.stock = 0;
    } else if (req.query.status === 'ok') {
      query.$expr = { $gt: ['$stock', '$lowStockThreshold'] };
    }

    if (req.query.search && req.query.search.trim()) {
      const reg = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ name: reg }, { sku: reg }];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ stock: 1 })
      .skip(skip)
      .limit(limit);

    // Summary counts
    const totalProducts = await Product.countDocuments();
    const lowStockCount = await Product.countDocuments({
      stock: { $gt: 0 },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });
    const outOfStockCount = await Product.countDocuments({ stock: 0 });

    res.status(200).json({
      success: true,
      data: products,
      summary: {
        totalProducts,
        lowStockCount,
        outOfStockCount
      },
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

// PUT /api/admin/inventory/:productId/adjust
exports.adjustProductStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { type, quantity, reason } = req.body;

    if (!type || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Type and quantity are required' });
    }

    const updatedProduct = await adjustStock(
      productId,
      type,
      Number(quantity),
      reason,
      req.user._id
    );

    // Log admin audit
    await AuditLog.create({
      action: 'INVENTORY_ADJUSTED',
      entity: 'Product',
      entityId: productId,
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      details: { type, quantity, reason, newStock: updatedProduct.stock }
    });

    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/inventory/:productId/logs
exports.getStockLogs = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { product: productId };
    const total = await InventoryLog.countDocuments(query);
    const logs = await InventoryLog.find(query)
      .populate('performedBy', 'name email role')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: logs,
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


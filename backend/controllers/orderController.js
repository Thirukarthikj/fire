const Order = require('../models/Order');
const { releaseStock } = require('../services/inventoryService');

// GET /api/orders
exports.getOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: orders,
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

// GET /api/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, user: req.user._id })
      .populate('items.product', 'name slug images sku');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/:id/cancel
exports.cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in its current status (${order.status}). Only pending or confirmed orders can be cancelled.`
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason || 'Cancelled by customer';
    order.statusHistory.push({
      status: 'cancelled',
      note: reason || 'Customer requested cancellation',
      updatedBy: req.user._id
    });

    await order.save();

    // Release stock back
    for (const item of order.items) {
      if (item.product) {
        await releaseStock(item.product, item.quantity, order._id, req.user._id);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};


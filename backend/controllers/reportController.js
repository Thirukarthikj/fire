const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Payment = require('../models/Payment');

// GET /api/admin/reports/sales
exports.getSalesReport = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, groupBy = 'day' } = req.query;

    const matchQuery = {
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' }
    };

    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = to;
      }
    }

    let dateGroupingFormat = '%Y-%m-%d';
    if (groupBy === 'month') dateGroupingFormat = '%Y-%m';
    if (groupBy === 'year') dateGroupingFormat = '%Y';

    const salesByPeriod = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: dateGroupingFormat, date: '$createdAt' } },
          totalSales: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          totalDiscount: { $sum: '$discount' },
          itemsSold: { $sum: { $sum: '$items.quantity' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Financial summaries
    const totalOrders = await Order.countDocuments(matchQuery);
    const revenueAgg = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$total' }, discount: { $sum: '$discount' } } }
    ]);

    const totalRevenue = revenueAgg[0] ? revenueAgg[0].total : 0;
    const totalDiscount = revenueAgg[0] ? revenueAgg[0].discount : 0;
    const averageOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    // Refund metrics
    const refundAgg = await Payment.aggregate([
      { $match: { totalRefunded: { $gt: 0 } } },
      { $group: { _id: null, totalRefunded: { $sum: '$totalRefunded' } } }
    ]);
    const totalRefunded = refundAgg[0] ? refundAgg[0].totalRefunded : 0;
    const netRevenue = totalRevenue - totalRefunded;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders,
          grossRevenue: totalRevenue,
          totalRefunded,
          netRevenue,
          totalDiscount,
          averageOrderValue
        },
        trends: salesByPeriod
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/products
exports.getProductReport = async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .sort({ sold: -1 });

    const report = products.map(p => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category ? p.category.name : 'Uncategorized',
      price: p.price,
      stock: p.stock,
      sold: p.sold || 0,
      totalRevenue: (p.sold || 0) * (p.discount > 0 ? Math.round(p.price * (1 - p.discount / 100)) : p.price),
      status: p.isActive ? 'Active' : 'Inactive'
    }));

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/orders
exports.getOrderReport = async (req, res, next) => {
  try {
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$total' } } }
    ]);

    const paymentStatusCounts = await Order.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 }, totalValue: { $sum: '$total' } } }
    ]);

    const totalOrders = await Order.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        byStatus: statusCounts,
        byPaymentStatus: paymentStatusCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/inventory
exports.getInventoryReport = async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .sort({ stock: 1 });

    const totalProducts = products.length;
    let outOfStock = 0;
    let lowStock = 0;
    let healthyStock = 0;
    let totalStockUnits = 0;
    let totalStockValue = 0;

    const items = products.map(p => {
      totalStockUnits += p.stock;
      totalStockValue += p.stock * p.price;

      let status = 'healthy';
      if (p.stock === 0) {
        status = 'out_of_stock';
        outOfStock++;
      } else if (p.stock <= p.lowStockThreshold) {
        status = 'low_stock';
        lowStock++;
      } else {
        healthyStock++;
      }

      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category ? p.category.name : 'Uncategorized',
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        price: p.price,
        stockValue: p.stock * p.price,
        status
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalStockUnits,
          totalStockValue,
          outOfStock,
          lowStock,
          healthyStock
        },
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/customers
exports.getCustomerReport = async (req, res, next) => {
  try {
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const activeCustomers = await User.countDocuments({ role: 'customer', isActive: true });

    // Top spenders
    const topSpenders = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$total' },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          totalOrders: 1,
          name: '$userDetails.name',
          email: '$userDetails.email',
          phone: '$userDetails.phone'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        topSpenders
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/coupons
exports.getCouponReport = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ usedCount: -1 });

    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.isActive && new Date(c.endDate) >= new Date()).length;
    const totalUses = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCoupons,
          activeCoupons,
          totalUses
        },
        coupons
      }
    });
  } catch (error) {
    next(error);
  }
};


const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const SupportTicket = require('../models/SupportTicket');
const SiteContent = require('../models/SiteContent');
const AuditLog = require('../models/AuditLog');
const { initiateRefund } = require('../services/paymentService');
const { releaseStock } = require('../services/inventoryService');
const { validateStatusTransition } = require('../services/orderService');
const { sanitizeUser } = require('../utils/helpers');
const { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * Process and upload files:
 * 1st: Uploads image to Cloudinary (if configured)
 * 2nd: Returns structured image object with secure_url & public_id for MongoDB storage
 */
async function processUploadedImages(files, productName, existingCount = 0) {
  if (!files || files.length === 0) return [];
  const processed = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isPrimary = (existingCount === 0 && i === 0);

    if (isCloudinaryConfigured()) {
      try {
        console.log(`[Cloudinary] 1st: Uploading "${file.originalname}" to Cloudinary for "${productName}"...`);
        const result = await uploadToCloudinary(file.path, {
          folder: 'firecrackers_products',
          tags: ['firecrackers', productName]
        });
        console.log(`[Cloudinary] 2nd: Image uploaded to Cloudinary: ${result.secure_url} (public_id: ${result.public_id})`);

        processed.push({
          url: result.secure_url,
          public_id: result.public_id,
          alt: productName,
          isPrimary
        });
      } catch (cloudErr) {
        console.error(`[Cloudinary] Upload failed for ${file.originalname}:`, cloudErr.message);
        processed.push({
          url: `/uploads/products/${file.filename}`,
          alt: productName,
          isPrimary
        });
      }
    } else {
      console.log(`[Upload] Cloudinary not configured in .env. Saving locally to /uploads/products/${file.filename}`);
      processed.push({
        url: `/uploads/products/${file.filename}`,
        alt: productName,
        isPrimary
      });
    }
  }

  return processed;
}

// Helper to log audit
async function logAudit(action, entity, entityId, req, details = {}, prev = {}, nextVal = {}) {
  try {
    await AuditLog.create({
      action,
      entity,
      entityId,
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      details,
      previousValues: prev,
      newValues: nextVal,
      ipAddress: req.ip
    });
  } catch (e) {
    console.error('AuditLog error:', e.message);
  }
}

// ================= ADMIN AUTH =================
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email ? email.toLowerCase() : '' });

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or non-admin account' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Administrator account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();
    req.session.userId = user._id;

    res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully',
      data: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// ================= DASHBOARD =================
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();

    // Financial KPIs
    const revAgg = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = revAgg[0] ? revAgg[0].total : 0;

    const successfulPayments = await Payment.countDocuments({ status: 'captured' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });

    const refundAgg = await Payment.aggregate([
      { $group: { _id: null, totalRefund: { $sum: '$totalRefunded' } } }
    ]);
    const refundTotals = refundAgg[0] ? refundAgg[0].totalRefund : 0;

    const lowStockAlerts = await Product.countDocuments({
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        totalCustomers,
        totalProducts,
        totalRevenue,
        successfulPayments,
        failedPayments,
        refundTotals,
        lowStockAlerts
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecentOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

exports.getSalesChart = async (req, res, next) => {
  try {
    // 7-day sales trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: trend
    });
  } catch (error) {
    next(error);
  }
};

// ================= PRODUCTS (ADMIN) =================
exports.getAllProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      const reg = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ name: reg }, { sku: reg }];
    }
    if (req.query.category) query.category = req.query.category;
    if (req.query.status === 'active') query.isActive = true;
    if (req.query.status === 'inactive') query.isActive = false;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
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

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const body = { ...req.body };

    // Parse JSON fields if stringified by multipart form
    if (typeof body.variants === 'string') {
      try { body.variants = JSON.parse(body.variants); } catch (e) { body.variants = []; }
    }
    if (typeof body.specifications === 'string') {
      try { body.specifications = JSON.parse(body.specifications); } catch (e) { body.specifications = []; }
    }
    if (typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // 1st: Upload images to Cloudinary (or fallback locally), 2nd: Store in MongoDB
    if (req.files && req.files.length > 0) {
      body.images = await processUploadedImages(req.files, body.name, 0);
    }

    const product = await Product.create(body);

    // Increment category productCount
    if (product.category) {
      await Category.findByIdAndUpdate(product.category, { $inc: { productCount: 1 } });
    }

    await logAudit('PRODUCT_CREATED', 'Product', product._id, req, { name: product.name, sku: product.sku });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    if (typeof body.variants === 'string') {
      try { body.variants = JSON.parse(body.variants); } catch (e) {}
    }
    if (typeof body.specifications === 'string') {
      try { body.specifications = JSON.parse(body.specifications); } catch (e) {}
    }
    if (typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const prev = await Product.findById(id);
    if (!prev) return res.status(404).json({ success: false, message: 'Product not found' });

    // Handle new uploaded images if submitted with edit form
    if (req.files && req.files.length > 0) {
      const newImages = await processUploadedImages(req.files, body.name || prev.name, prev.images ? prev.images.length : 0);
      body.images = [...(prev.images || []), ...newImages];
    }

    const updated = await Product.findByIdAndUpdate(id, body, { new: true });

    await logAudit('PRODUCT_UPDATED', 'Product', id, req, { sku: updated.sku }, prev.toObject(), updated.toObject());

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Soft delete by setting isActive to false
    product.isActive = false;
    await product.save();

    await logAudit('PRODUCT_ARCHIVED', 'Product', id, req, { name: product.name });

    res.status(200).json({
      success: true,
      message: 'Product archived successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadProductImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    // 1st: Upload to Cloudinary, 2nd: Store in MongoDB product.images
    const newImages = await processUploadedImages(req.files, product.name, product.images.length);

    product.images.push(...newImages);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: product.images
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProductImage = async (req, res, next) => {
  try {
    const { id, imgId } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const targetImg = product.images.find(img => img._id.toString() === imgId);
    if (targetImg && targetImg.public_id) {
      console.log(`[Cloudinary] Deleting image asset ${targetImg.public_id} from Cloudinary...`);
      await deleteFromCloudinary(targetImg.public_id);
    }

    product.images = product.images.filter(img => img._id.toString() !== imgId);
    if (product.images.length > 0 && !product.images.some(img => img.isPrimary)) {
      product.images[0].isPrimary = true;
    }
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Image removed successfully',
      data: product.images
    });
  } catch (error) {
    next(error);
  }
};

// ================= CATEGORIES (ADMIN) =================
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate('parent', 'name').sort({ displayOrder: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    await logAudit('CATEGORY_CREATED', 'Category', category._id, req, { name: category.name });
    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    await logAudit('CATEGORY_UPDATED', 'Category', category._id, req, { name: category.name });
    res.status(200).json({ success: true, message: 'Category updated', data: category });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const productCount = await Product.countDocuments({ category: req.params.id, isActive: true });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: contains ${productCount} active product(s). Please reassign them first.`
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    await logAudit('CATEGORY_DELETED', 'Category', req.params.id, req);
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

// ================= ORDERS (ADMIN) =================
exports.getAllOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
    if (req.query.paymentStatus && req.query.paymentStatus !== 'all') query.paymentStatus = req.query.paymentStatus;
    if (req.query.dateFrom || req.query.dateTo) {
      query.createdAt = {};
      if (req.query.dateFrom) query.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const to = new Date(req.query.dateTo);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }
    if (req.query.search) {
      query.orderNumber = new RegExp(req.query.search.trim(), 'i');
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
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

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name sku images price');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const payment = await Payment.findOne({ order: order._id });

    res.status(200).json({
      success: true,
      data: {
        order,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!validateStatusTransition(order.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from "${order.status}" to "${status}"`
      });
    }

    const oldStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      status,
      note: note || `Status changed from ${oldStatus} to ${status}`,
      updatedBy: req.user._id
    });

    // If order transitioned to cancelled, release stock back
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      for (const item of order.items) {
        if (item.product) {
          await releaseStock(item.product, item.quantity, order._id, req.user._id);
        }
      }
    }

    await order.save();
    await logAudit('ORDER_STATUS_CHANGED', 'Order', order._id, req, { from: oldStatus, to: status, note });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// ================= PAYMENTS (ADMIN) =================
exports.getAllPayments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status && req.query.status !== 'all') query.status = req.query.status;

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('user', 'name email phone')
      .populate('order', 'orderNumber total status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: payments,
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

exports.getPaymentDetail = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('order');

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.issueRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (payment.status !== 'captured' && payment.status !== 'partially_refunded') {
      return res.status(400).json({
        success: false,
        message: 'Only captured payments can be refunded'
      });
    }

    const refundAmount = Number(amount) || (payment.amount - payment.totalRefunded);
    if (refundAmount <= 0 || refundAmount > (payment.amount - payment.totalRefunded)) {
      return res.status(400).json({
        success: false,
        message: `Invalid refund amount. Maximum refundable: ₹${payment.amount - payment.totalRefunded}`
      });
    }

    let refundResult;
    try {
      refundResult = await initiateRefund(payment.razorpayPaymentId, refundAmount, { reason });
    } catch (rzpErr) {
      console.warn('[Razorpay API Warning] Mock refund applied for development mode');
      refundResult = { id: `rfnd_${Date.now()}_test`, status: 'processed' };
    }

    payment.refunds.push({
      refundId: refundResult.id,
      amount: refundAmount,
      reason: reason || 'Customer refund',
      status: 'processed',
      createdAt: new Date()
    });

    payment.totalRefunded = (payment.totalRefunded || 0) + refundAmount;
    payment.status = payment.totalRefunded >= payment.amount ? 'refunded' : 'partially_refunded';
    await payment.save();

    // Update related order paymentStatus
    const order = await Order.findById(payment.order);
    if (order) {
      order.paymentStatus = payment.status;
      order.statusHistory.push({
        status: order.status,
        note: `Refund issued: ₹${refundAmount} (${reason || 'Refund'})`,
        updatedBy: req.user._id
      });
      await order.save();
    }

    await logAudit('REFUND_ISSUED', 'Payment', payment._id, req, { amount: refundAmount, reason });

    res.status(200).json({
      success: true,
      message: `Refund of ₹${refundAmount} processed successfully`,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// ================= CUSTOMERS (ADMIN) =================
exports.getAllCustomers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { role: 'customer' };
    if (req.query.search) {
      const reg = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ name: reg }, { email: reg }, { phone: reg }];
    }

    const total = await User.countDocuments(query);
    const customers = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: customers.map(c => sanitizeUser(c)),
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

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'customer' });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const orders = await Order.find({ user: customer._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        customer: sanitizeUser(customer),
        orders
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleCustomerStatus = async (req, res, next) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'customer' });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    customer.isActive = !customer.isActive;
    await customer.save();

    await logAudit('CUSTOMER_STATUS_TOGGLED', 'User', customer._id, req, { isActive: customer.isActive });

    res.status(200).json({
      success: true,
      message: `Customer ${customer.isActive ? 'activated' : 'deactivated'} successfully`,
      data: sanitizeUser(customer)
    });
  } catch (error) {
    next(error);
  }
};

// ================= COUPONS (ADMIN) =================
exports.getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);
    await logAudit('COUPON_CREATED', 'Coupon', coupon._id, req, { code: coupon.code });
    res.status(201).json({ success: true, message: 'Coupon created successfully', data: coupon });
  } catch (error) {
    next(error);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    await logAudit('COUPON_UPDATED', 'Coupon', coupon._id, req, { code: coupon.code });
    res.status(200).json({ success: true, message: 'Coupon updated successfully', data: coupon });
  } catch (error) {
    next(error);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    await logAudit('COUPON_DELETED', 'Coupon', req.params.id, req, { code: coupon.code });
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ================= SUPPORT (ADMIN) =================
exports.getAllTickets = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status && req.query.status !== 'all') query.status = req.query.status;

    const total = await SupportTicket.countDocuments(query);
    const tickets = await SupportTicket.find(query)
      .populate('user', 'name email phone')
      .populate('order', 'orderNumber')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: tickets,
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

exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('order');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

exports.adminReplyTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.messages.push({
      sender: 'admin',
      senderName: req.user.name,
      message: message.trim(),
      timestamp: new Date()
    });

    ticket.status = 'in-progress';
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Admin response posted successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticket = await SupportTicket.findByIdAndUpdate(id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}`,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// ================= CONTENT (ADMIN) =================
exports.getAllContent = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.type) query.type = req.query.type;
    const content = await SiteContent.find(query).sort({ displayOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
};

exports.createContent = async (req, res, next) => {
  try {
    const content = await SiteContent.create(req.body);
    await logAudit('CONTENT_CREATED', 'SiteContent', content._id, req, { title: content.title, type: content.type });
    res.status(201).json({ success: true, message: 'Content created successfully', data: content });
  } catch (error) {
    next(error);
  }
};

exports.updateContent = async (req, res, next) => {
  try {
    const content = await SiteContent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!content) return res.status(404).json({ success: false, message: 'Content item not found' });
    await logAudit('CONTENT_UPDATED', 'SiteContent', content._id, req, { title: content.title });
    res.status(200).json({ success: true, message: 'Content updated successfully', data: content });
  } catch (error) {
    next(error);
  }
};

exports.deleteContent = async (req, res, next) => {
  try {
    const content = await SiteContent.findByIdAndDelete(req.params.id);
    if (!content) return res.status(404).json({ success: false, message: 'Content item not found' });
    await logAudit('CONTENT_DELETED', 'SiteContent', req.params.id, req);
    res.status(200).json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ================= ADMINISTRATORS =================
exports.getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: admins.map(a => sanitizeUser(a)) });
  } catch (error) {
    next(error);
  }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role = 'admin', phone } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role === 'superadmin' ? 'superadmin' : 'admin',
      phone
    });

    await logAudit('ADMIN_CREATED', 'User', admin._id, req, { email: admin.email, role: admin.role });

    res.status(201).json({
      success: true,
      message: 'Administrator created successfully',
      data: sanitizeUser(admin)
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, role, isActive } = req.body;

    const admin = await User.findById(id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (name) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (role && (role === 'admin' || role === 'superadmin')) admin.role = role;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();
    await logAudit('ADMIN_UPDATED', 'User', admin._id, req, { email: admin.email });

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: sanitizeUser(admin)
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own administrator account' });
    }

    await User.findByIdAndDelete(id);
    await logAudit('ADMIN_DELETED', 'User', id, req);

    res.status(200).json({ success: true, message: 'Administrator removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ================= AUDIT LOGS =================
exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.action) query.action = req.query.action;
    if (req.query.entity) query.entity = req.query.entity;
    if (req.query.dateFrom || req.query.dateTo) {
      query.createdAt = {};
      if (req.query.dateFrom) query.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const to = new Date(req.query.dateTo);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
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

// ================= SETTINGS =================
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await SiteContent.findOne({ type: 'setting' });
    if (!settings) {
      settings = {
        metadata: {
          siteName: 'Firecrackers E-Commerce',
          siteDescription: 'Modern Minimal Firecrackers Online Store',
          contactEmail: 'support@firecrackers-store.com',
          contactPhone: '+91 98765 43210',
          currencySymbol: '₹',
          taxRate: '0',
          shippingCharge: '100',
          freeShippingThreshold: '1500',
          orderPrefix: 'ORD',
          maintenanceMode: 'false',
          allowedStates: 'Tamil Nadu, Karnataka, Andhra Pradesh, Maharashtra, Kerala'
        }
      };
    }

    res.status(200).json({
      success: true,
      data: settings.metadata || {}
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await SiteContent.findOne({ type: 'setting' });
    if (!settings) {
      settings = new SiteContent({
        type: 'setting',
        title: 'Site Settings',
        metadata: {}
      });
    }

    settings.metadata = {
      ...settings.metadata,
      ...req.body
    };

    await settings.save();
    await logAudit('SETTINGS_UPDATED', 'SiteContent', settings._id, req, req.body);

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings.metadata
    });
  } catch (error) {
    next(error);
  }
};


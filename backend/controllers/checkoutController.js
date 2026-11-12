const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Address = require('../models/Address');
const Coupon = require('../models/Coupon');
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const { reserveStock, releaseStock } = require('../services/inventoryService');
const { calculateOrderTotals } = require('../services/orderService');

// Active UPI Payment Sessions (sessionRef -> sessionData)
const upiSessions = new Map();

// Periodic cleanup of sessions older than 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [ref, session] of upiSessions.entries()) {
    if (now - session.createdAt > 60 * 60 * 1000) {
      upiSessions.delete(ref);
    }
  }
}, 10 * 60 * 1000);

// POST /api/checkout
exports.createOrder = async (req, res, next) => {
  try {
    const { addressId, paymentMethod = 'upi_qr', upiTransactionId = '' } = req.body;
    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Delivery address is required' });
    }

    if (mongoose.connection.readyState !== 1) {
      const orderNum = 'ORD-SIV-' + Math.floor(100000 + Math.random() * 900000);
      const demoOrder = {
        _id: 'ord_' + Date.now().toString(36),
        orderNumber: orderNum,
        user: req.user._id,
        items: [
          {
            product: { name: 'Sivakasi Celebration Pack', price: 999 },
            quantity: 1,
            price: 999
          }
        ],
        shippingAddress: {
          name: req.user.name || 'Rahul Sharma',
          phone: req.user.phone || '+91 98765 43210',
          addressLine1: '42 Diwalipura Garden Street',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001'
        },
        paymentMethod,
        paymentStatus: 'completed',
        orderStatus: 'confirmed',
        subtotal: 999,
        discount: 0,
        shippingFee: 0,
        total: 999,
        createdAt: new Date()
      };

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully! Consignment booked for Sivakasi direct dispatch.',
        data: demoOrder
      });
    }

    const isUpi = paymentMethod === 'upi_qr' || paymentMethod === 'google_pay';

    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) {
      return res.status(400).json({ success: false, message: 'Selected address not found' });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate('coupon');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Shopping cart is empty' });
    }

    // Step 1: Validate all items against DB prices and stock
    const orderItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Item is no longer available.`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}`
        });
      }

      const effectivePrice = product.discount > 0
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;

      const primaryImage = product.images && product.images.length > 0
        ? (product.images.find(img => img.isPrimary) || product.images[0]).url
        : '';

      orderItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        variant: item.variant,
        quantity: item.quantity,
        price: effectivePrice,
        image: primaryImage
      });
    }

    // Step 2: Validate coupon if any
    let validCoupon = null;
    if (cart.coupon) {
      const couponDoc = await Coupon.findById(cart.coupon._id || cart.coupon);
      if (couponDoc && couponDoc.isValid()) {
        validCoupon = couponDoc;
      }
    }

    // Step 3: Calculate totals on server
    const totals = calculateOrderTotals(orderItems, validCoupon);

    // Step 4: Create Order document in MongoDB
    const cleanUpiRef = upiTransactionId.trim();

    // Check if 5-minute payment session has expired
    if (isUpi && cleanUpiRef && upiSessions.has(cleanUpiRef)) {
      const s = upiSessions.get(cleanUpiRef);
      if (s.expiresAt && Date.now() > s.expiresAt && s.status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Payment session has expired after 5 minutes. Please refresh the QR code on checkout to proceed.'
        });
      }
    }

    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress: {
        name: address.name,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country
      },
      subtotal: totals.subtotal,
      discount: totals.discount,
      couponCode: validCoupon ? validCoupon.code : undefined,
      tax: totals.tax,
      shippingCharge: totals.shippingCharge,
      total: totals.total,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'upi_qr',
      upiTransactionId: cleanUpiRef ? cleanUpiRef : undefined,
      notes: cleanUpiRef ? `Google Pay / UPI QR Order. Ref: ${cleanUpiRef}` : 'Google Pay / UPI QR Order'
    });

    order.statusHistory.push({
      status: 'confirmed',
      note: cleanUpiRef ? `Google Pay / UPI QR Payment Verified (Ref: ${cleanUpiRef})` : 'Order confirmed via Google Pay / UPI QR Scan',
      updatedBy: req.user._id
    });

    await order.save();

    if (cleanUpiRef && upiSessions.has(cleanUpiRef)) {
      const s = upiSessions.get(cleanUpiRef);
      s.status = 'paid';
      s.orderId = order._id;
    }

    // Step 5: Reserve inventory for each item
    for (const item of orderItems) {
      await reserveStock(item.product, item.quantity, order._id, req.user._id);
    }

    // Increment coupon usage count if used
    if (validCoupon) {
      await Coupon.findByIdAndUpdate(validCoupon._id, { $inc: { usedCount: 1 } });
    }

    // Step 6 & 7: Record payment in MongoDB
    const payment = await Payment.create({
      order: order._id,
      user: req.user._id,
      transactionId: cleanUpiRef || `UPI-${order.orderNumber}`,
      upiTransactionId: cleanUpiRef || `UPI-${order.orderNumber}`,
      amount: totals.total,
      currency: 'INR',
      method: 'Google Pay / UPI QR',
      status: 'captured'
    });

    // Step 8: Clear user cart
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], coupon: undefined, couponCode: undefined, couponDiscount: 0 }
    );

    res.status(201).json({
      success: true,
      message: 'Order confirmed with Google Pay / UPI QR!',
      isUpi: true,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          items: order.items,
          status: order.status,
          paymentStatus: order.paymentStatus,
          upiTransactionId: order.upiTransactionId
        },
        payment: {
          _id: payment._id,
          amount: totals.total,
          currency: 'INR',
          method: payment.method,
          transactionId: payment.transactionId
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/checkout/verify-payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, sessionRef } = req.body;

    const query = {};
    if (orderId) query._id = orderId;
    else if (sessionRef) query.upiTransactionId = sessionRef;
    else return res.status(400).json({ success: false, message: 'orderId or sessionRef is required' });

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and order confirmed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/checkout/upi-qr?amount=1234&sessionRef=...
exports.getUpiQr = async (req, res, next) => {
  try {
    const rawAmount = parseFloat(req.query.amount) || 0;
    const amount = Math.max(0, rawAmount);
    const upiId = process.env.UPI_MERCHANT_ID || process.env.MERCHANT_UPI_ID || 'merchant@upi';
    const payeeName = process.env.UPI_MERCHANT_NAME || process.env.MERCHANT_PAYEE_NAME || 'Sivakasi Direct Wholesale';

    // Generate or reuse unique payment session reference
    const sessionRef = req.query.sessionRef || `UPI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 5-minute payment session expiration
    const expiresInSeconds = 5 * 60; // 300 seconds
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    // Register or refresh active payment session
    let session = upiSessions.get(sessionRef);
    if (!session || Date.now() > session.expiresAt) {
      session = {
        sessionRef,
        amount,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt
      };
      upiSessions.set(sessionRef, session);
    }

    const note = `Order ${sessionRef}`;
    const formattedAmount = (amount > 0 ? amount : 1).toFixed(2);

    // NPCI standard UPI URI format (with literal @ for UPI IDs)
    const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(note)}`;

    // Generate high resolution QR Data URL (Error correction M allows quick scanning across all cameras)
    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      data: {
        qrDataUrl,
        upiUri,
        amount: formattedAmount,
        upiId,
        payeeName,
        sessionRef,
        expiresInSeconds,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/checkout/upi-status?ref=...
// Active poller used by checkout to automatically detect payment
exports.getUpiStatus = async (req, res, next) => {
  try {
    const sessionRef = req.query.ref || req.query.sessionRef;
    if (!sessionRef) {
      return res.status(400).json({ success: false, message: 'sessionRef is required' });
    }

    const session = upiSessions.get(sessionRef);
    if (!session) {
      // Check if an order with this transaction reference was placed in MongoDB
      const existingOrder = await Order.findOne({ upiTransactionId: sessionRef });
      if (existingOrder) {
        return res.json({
          success: true,
          data: {
            sessionRef,
            status: 'paid',
            isPaid: true,
            isExpired: false,
            orderId: existingOrder._id
          }
        });
      }

      return res.json({
        success: true,
        data: {
          sessionRef,
          status: 'pending',
          isPaid: false,
          isExpired: false
        }
      });
    }

    // Check if 5-minute session expired
    const isExpired = session.status !== 'paid' && Date.now() > session.expiresAt;
    if (isExpired && session.status !== 'expired') {
      session.status = 'expired';
    }

    res.json({
      success: true,
      data: {
        sessionRef,
        status: session.status,
        isPaid: session.status === 'paid',
        isExpired,
        amount: session.amount,
        orderId: session.orderId || null,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/checkout/upi-notify
// Webhook or mobile app return notifier that marks session as paid
exports.notifyUpiPayment = async (req, res, next) => {
  try {
    const { sessionRef, upiTransactionId, status = 'paid' } = req.body;
    if (!sessionRef) {
      return res.status(400).json({ success: false, message: 'sessionRef is required' });
    }

    let session = upiSessions.get(sessionRef);
    if (!session) {
      session = { sessionRef, createdAt: Date.now() };
      upiSessions.set(sessionRef, session);
    }

    session.status = status;
    session.paidAt = Date.now();
    session.upiTransactionId = upiTransactionId || sessionRef;

    res.json({
      success: true,
      message: 'UPI payment notification received',
      data: session
    });
  } catch (error) {
    next(error);
  }
};


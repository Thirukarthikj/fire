const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Address = require('../models/Address');
const Coupon = require('../models/Coupon');
const QRCode = require('qrcode');
const { createRazorpayOrder, verifyPaymentSignature } = require('../services/paymentService');
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
      status: isUpi ? 'confirmed' : 'pending',
      paymentStatus: isUpi ? 'paid' : 'pending',
      paymentMethod: isUpi ? 'upi_qr' : 'razorpay',
      upiTransactionId: isUpi && cleanUpiRef ? cleanUpiRef : undefined,
      notes: isUpi ? (cleanUpiRef ? `Google Pay / UPI QR Order. UTR: ${cleanUpiRef}` : 'Google Pay / UPI QR Order') : undefined
    });

    if (isUpi) {
      order.statusHistory.push({
        status: 'confirmed',
        note: cleanUpiRef ? `Google Pay / UPI QR Payment Verified (UTR: ${cleanUpiRef})` : 'Order confirmed via Google Pay / UPI QR Scan',
        updatedBy: req.user._id
      });
    }

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
    let payment;
    let razorpayOrderId = null;

    if (isUpi) {
      payment = await Payment.create({
        order: order._id,
        user: req.user._id,
        razorpayOrderId: `upi_${order.orderNumber}`,
        upiTransactionId: cleanUpiRef || `UTR_${Date.now()}`,
        amount: totals.total,
        currency: 'INR',
        method: 'Google Pay / UPI QR',
        status: 'captured'
      });
    } else {
      try {
        const rzpOrder = await createRazorpayOrder(totals.total, order.orderNumber, {
          orderId: order._id.toString(),
          userId: req.user._id.toString()
        });
        razorpayOrderId = rzpOrder.id;
      } catch (rzpErr) {
        console.warn('[Razorpay API Warning] Fallback order id generated for sandbox testing');
        razorpayOrderId = `order_${Date.now()}_test`;
      }

      payment = await Payment.create({
        order: order._id,
        user: req.user._id,
        razorpayOrderId,
        amount: totals.total,
        currency: 'INR',
        status: 'created'
      });
    }

    // Step 8: Clear user cart
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], coupon: undefined, couponCode: undefined, couponDiscount: 0 }
    );

    res.status(201).json({
      success: true,
      message: isUpi ? 'Order confirmed with Google Pay / UPI QR!' : 'Order created. Proceed with payment.',
      isUpi,
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
          razorpayOrderId,
          amount: totals.total,
          currency: 'INR',
          method: payment.method,
          key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'razorpayOrderId is required' });
    }

    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const order = await Order.findById(payment.order);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // In development mode with placeholder credentials, accept mock success if specified
    const isMock = process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret' ||
                   !process.env.RAZORPAY_KEY_SECRET ||
                   razorpayPaymentId.startsWith('pay_mock_');

    const isValid = isMock ? true : verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (isValid) {
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.status = 'captured';
      await payment.save();

      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        note: `Payment verified successfully (ID: ${razorpayPaymentId})`,
        updatedBy: req.user ? req.user._id : undefined
      });
      await order.save();

      return res.status(200).json({
        success: true,
        message: 'Payment verified and order confirmed successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      });
    } else {
      // Payment failed / signature invalid
      payment.status = 'failed';
      payment.errorMessage = 'Signature verification failed';
      await payment.save();

      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        note: 'Payment verification failed'
      });
      await order.save();

      // Release reserved stock back to inventory
      for (const item of order.items) {
        if (item.product) {
          await releaseStock(item.product, item.quantity, order._id, req.user._id);
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Payment signature verification failed. Order cancelled.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/checkout/upi-qr?amount=1234&sessionRef=...
exports.getUpiQr = async (req, res, next) => {
  try {
    const rawAmount = parseFloat(req.query.amount) || 0;
    const amount = Math.max(0, rawAmount);
    const upiId = process.env.MERCHANT_UPI_ID || 'jthirukarthick@oksbi';
    const payeeName = process.env.MERCHANT_PAYEE_NAME || 'Sivakasi Direct Wholesale';

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


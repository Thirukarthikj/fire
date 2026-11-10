const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Helper to get or create populated cart
async function getPopulatedCart(userId) {
  let cart = await Cart.findOne({ user: userId })
    .populate('items.product', 'name slug price comparePrice discount images stock isActive sku')
    .populate('coupon');

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

// GET /api/cart
exports.getCart = async (req, res, next) => {
  try {
    const cart = await getPopulatedCart(req.user._id);

    // Filter out inactive products or recalculate prices based on current product prices
    let itemsModified = false;
    const validItems = [];

    for (const item of cart.items) {
      if (item.product && item.product.isActive) {
        // Effective price calculation
        const effectivePrice = item.product.discount > 0
          ? Math.round(item.product.price * (1 - item.product.discount / 100))
          : item.product.price;

        if (item.price !== effectivePrice) {
          item.price = effectivePrice;
          itemsModified = true;
        }
        validItems.push(item);
      } else {
        itemsModified = true;
      }
    }

    if (itemsModified) {
      cart.items = validItems;
    }

    // Revalidate coupon if applied
    if (cart.coupon) {
      const subtotal = cart.getSubtotal();
      if (!cart.coupon.isValid() || (cart.coupon.minOrderAmount && subtotal < cart.coupon.minOrderAmount)) {
        cart.coupon = undefined;
        cart.couponCode = undefined;
        cart.couponDiscount = 0;
        itemsModified = true;
      } else {
        const newDiscount = cart.coupon.calculateDiscount(subtotal);
        if (cart.couponDiscount !== newDiscount) {
          cart.couponDiscount = newDiscount;
          itemsModified = true;
        }
      }
    }

    if (itemsModified) {
      await cart.save();
    }

    res.status(200).json({
      success: true,
      data: {
        _id: cart._id,
        items: cart.items,
        coupon: cart.coupon,
        couponCode: cart.couponCode,
        couponDiscount: cart.couponDiscount,
        subtotal: cart.getSubtotal(),
        total: cart.getTotal(),
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/cart/add
exports.addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1, variant } = req.body;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }

    if (product.stock < qty) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} unit(s) available in stock`
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const effectivePrice = product.discount > 0
      ? Math.round(product.price * (1 - product.discount / 100))
      : product.price;

    // Check if product (+ variant if any) already exists in cart
    const existingIndex = cart.items.findIndex(item => {
      const sameProduct = item.product.toString() === productId;
      if (!sameProduct) return false;
      if (variant && item.variant) {
        return item.variant.name === variant.name && item.variant.option === variant.option;
      }
      return !variant && !item.variant;
    });

    if (existingIndex > -1) {
      const newTotalQty = cart.items[existingIndex].quantity + qty;
      if (product.stock < newTotalQty) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Stock limit of ${product.stock} reached for this item.`
        });
      }
      cart.items[existingIndex].quantity = newTotalQty;
      cart.items[existingIndex].price = effectivePrice;
    } else {
      cart.items.push({
        product: product._id,
        variant,
        quantity: qty,
        price: effectivePrice
      });
    }

    // Recompute coupon if present
    if (cart.coupon) {
      const coupon = await Coupon.findById(cart.coupon);
      if (coupon && coupon.isValid()) {
        cart.couponDiscount = coupon.calculateDiscount(cart.getSubtotal());
      } else {
        cart.coupon = undefined;
        cart.couponCode = undefined;
        cart.couponDiscount = 0;
      }
    }

    await cart.save();
    return exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// PUT /api/cart/update
exports.updateItem = async (req, res, next) => {
  try {
    const { itemId, quantity } = req.body;
    const qty = parseInt(quantity, 10);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    if (qty <= 0) {
      item.deleteOne();
    } else {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        item.deleteOne();
      } else if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} available in stock`
        });
      } else {
        item.quantity = qty;
        const effectivePrice = product.discount > 0
          ? Math.round(product.price * (1 - product.discount / 100))
          : product.price;
        item.price = effectivePrice;
      }
    }

    // Recompute coupon discount
    if (cart.coupon) {
      const coupon = await Coupon.findById(cart.coupon);
      if (coupon && coupon.isValid()) {
        cart.couponDiscount = coupon.calculateDiscount(cart.getSubtotal());
      } else {
        cart.coupon = undefined;
        cart.couponCode = undefined;
        cart.couponDiscount = 0;
      }
    }

    await cart.save();
    return exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/cart/remove/:itemId
exports.removeItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);

    if (cart.coupon) {
      const coupon = await Coupon.findById(cart.coupon);
      if (coupon && coupon.isValid()) {
        cart.couponDiscount = coupon.calculateDiscount(cart.getSubtotal());
      } else {
        cart.coupon = undefined;
        cart.couponCode = undefined;
        cart.couponDiscount = 0;
      }
    }

    await cart.save();
    return exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// POST /api/cart/apply-coupon
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired or usage limit exceeded' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const subtotal = cart.getSubtotal();
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
      });
    }

    const discount = coupon.calculateDiscount(subtotal);
    cart.coupon = coupon._id;
    cart.couponCode = coupon.code;
    cart.couponDiscount = discount;
    await cart.save();

    return exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/cart/remove-coupon
exports.removeCoupon = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.coupon = undefined;
      cart.couponCode = undefined;
      cart.couponDiscount = 0;
      await cart.save();
    }
    return exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/cart/clear
exports.clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], coupon: undefined, couponCode: undefined, couponDiscount: 0 }
    );
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: { items: [], subtotal: 0, total: 0, itemCount: 0 }
    });
  } catch (error) {
    next(error);
  }
};


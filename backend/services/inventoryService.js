const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');

const checkStock = async (productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  if (!product.isActive) {
    throw new Error(`Product "${product.name}" is no longer available.`);
  }
  if (product.stock < quantity) {
    return {
      available: false,
      productName: product.name,
      currentStock: product.stock,
      requested: quantity
    };
  }
  return {
    available: true,
    productName: product.name,
    currentStock: product.stock
  };
};

const reserveStock = async (productId, quantity, orderId, userId) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity, sold: quantity } },
    { new: true }
  );

  if (!product) {
    throw new Error('Insufficient stock or product unavailable during reservation');
  }

  // Create audit log for stock movement
  await InventoryLog.create({
    product: productId,
    type: 'sale',
    quantity: -quantity,
    previousStock: product.stock + quantity,
    newStock: product.stock,
    reason: `Order placed #${orderId}`,
    performedBy: userId,
    order: orderId
  });

  return product;
};

const releaseStock = async (productId, quantity, orderId, userId) => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { $inc: { stock: quantity, sold: -quantity } },
    { new: true }
  );

  if (product) {
    await InventoryLog.create({
      product: productId,
      type: 'return',
      quantity: quantity,
      previousStock: product.stock - quantity,
      newStock: product.stock,
      reason: `Order cancelled/failed #${orderId}`,
      performedBy: userId,
      order: orderId
    });
  }

  return product;
};

const adjustStock = async (productId, type, quantity, reason, userId) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const previousStock = product.stock;
  let newStock = previousStock;

  if (type === 'addition' || type === 'return') {
    newStock = previousStock + Math.abs(quantity);
  } else if (type === 'reduction' || type === 'sale' || type === 'damage') {
    newStock = Math.max(0, previousStock - Math.abs(quantity));
  } else if (type === 'adjustment') {
    newStock = Math.max(0, quantity);
  }

  product.stock = newStock;
  await product.save();

  await InventoryLog.create({
    product: productId,
    type,
    quantity: newStock - previousStock,
    previousStock,
    newStock,
    reason: reason || 'Manual stock adjustment by admin',
    performedBy: userId
  });

  return product;
};

module.exports = {
  checkStock,
  reserveStock,
  releaseStock,
  adjustStock
};


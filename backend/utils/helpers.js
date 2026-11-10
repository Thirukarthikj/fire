const crypto = require('crypto');

function generateSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

function generateTicketNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKT-${random}`;
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sanitizeUser(user) {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpiry;
  delete userObj.__v;
  return userObj;
}

module.exports = {
  generateSlug,
  generateOrderNumber,
  generateTicketNumber,
  formatCurrency,
  sanitizeUser
};


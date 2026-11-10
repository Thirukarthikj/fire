const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const inventoryController = require('../controllers/inventoryController');
const reportController = require('../controllers/reportController');

const { isAdmin, isSuperAdmin } = require('../middleware/auth');
const { uploadProductImages } = require('../middleware/upload');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateProduct, validateCoupon } = require('../middleware/validator');

// Admin Login (public route with auth rate limit)
router.post('/login', authLimiter, adminController.adminLogin);

// All subsequent routes require Admin authentication
router.use(isAdmin);

// --- Dashboard ---
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/recent-orders', adminController.getRecentOrders);
router.get('/dashboard/sales-chart', adminController.getSalesChart);

// --- Products ---
router.get('/products', adminController.getAllProducts);
router.post('/products', uploadProductImages, validateProduct, adminController.createProduct);
router.get('/products/:id', adminController.getProduct);
router.put('/products/:id', uploadProductImages, validateProduct, adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/:id/images', uploadProductImages, adminController.uploadProductImages);
router.delete('/products/:id/images/:imgId', adminController.deleteProductImage);

// --- Categories ---
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// --- Inventory ---
router.get('/inventory', inventoryController.getInventory);
router.put('/inventory/:productId/adjust', inventoryController.adjustProductStock);
router.get('/inventory/:productId/logs', inventoryController.getStockLogs);

// --- Orders ---
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:id', adminController.getOrder);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// --- Payments & Refunds ---
router.get('/payments', adminController.getAllPayments);
router.get('/payments/:id', adminController.getPaymentDetail);
router.post('/payments/:id/refund', adminController.issueRefund);

// --- Customers ---
router.get('/customers', adminController.getAllCustomers);
router.get('/customers/:id', adminController.getCustomer);
router.put('/customers/:id/status', adminController.toggleCustomerStatus);

// --- Coupons ---
router.get('/coupons', adminController.getAllCoupons);
router.post('/coupons', validateCoupon, adminController.createCoupon);
router.put('/coupons/:id', validateCoupon, adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

// --- Support ---
router.get('/support', adminController.getAllTickets);
router.get('/support/:id', adminController.getTicket);
router.post('/support/:id/reply', adminController.adminReplyTicket);
router.put('/support/:id/status', adminController.updateTicketStatus);

// --- Content ---
router.get('/content', adminController.getAllContent);
router.post('/content', adminController.createContent);
router.put('/content/:id', adminController.updateContent);
router.delete('/content/:id', adminController.deleteContent);

// --- Reports ---
router.get('/reports/sales', reportController.getSalesReport);
router.get('/reports/products', reportController.getProductReport);
router.get('/reports/orders', reportController.getOrderReport);
router.get('/reports/inventory', reportController.getInventoryReport);
router.get('/reports/customers', reportController.getCustomerReport);
router.get('/reports/coupons', reportController.getCouponReport);

// --- Administrators (Super Admin only for management) ---
router.get('/administrators', adminController.getAdmins);
router.post('/administrators', isSuperAdmin, adminController.createAdmin);
router.put('/administrators/:id', isSuperAdmin, adminController.updateAdmin);
router.delete('/administrators/:id', isSuperAdmin, adminController.deleteAdmin);

// --- Audit Logs ---
router.get('/audit-logs', adminController.getAuditLogs);

// --- Settings ---
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;


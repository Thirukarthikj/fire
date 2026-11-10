const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/auth');

// Webhook does not use session authentication
router.post('/webhook', paymentController.handleWebhook);

// Protected routes
router.get('/:orderId', isAuthenticated, paymentController.getPaymentByOrderId);

module.exports = router;


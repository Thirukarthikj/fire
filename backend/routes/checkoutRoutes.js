const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { isAuthenticated } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validator');

// Public or authenticated UPI QR & Payment Status Poller
router.get('/upi-qr', checkoutController.getUpiQr);
router.get('/upi-status', checkoutController.getUpiStatus);
router.post('/upi-notify', checkoutController.notifyUpiPayment);

router.use(isAuthenticated);

router.post('/', validateOrder, checkoutController.createOrder);
router.post('/verify-payment', checkoutController.verifyPayment);

module.exports = router;


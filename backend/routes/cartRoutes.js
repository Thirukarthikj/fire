const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

router.get('/', cartController.getCart);
router.post('/add', cartController.addItem);
router.put('/update', cartController.updateItem);
router.delete('/remove/:itemId', cartController.removeItem);
router.post('/apply-coupon', cartController.applyCoupon);
router.delete('/remove-coupon', cartController.removeCoupon);
router.delete('/clear', cartController.clearCart);

module.exports = router;


const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/validate', isAuthenticated, couponController.validateCoupon);

module.exports = router;


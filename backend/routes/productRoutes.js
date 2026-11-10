const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/best-sellers', productController.getBestSellers);
router.get('/:id', productController.getProductByIdOrSlug);
router.get('/:id/related', productController.getRelatedProducts);

module.exports = router;


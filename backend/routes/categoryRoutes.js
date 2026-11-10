const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryByIdOrSlug);
router.get('/:id/products', categoryController.getCategoryProducts);

module.exports = router;


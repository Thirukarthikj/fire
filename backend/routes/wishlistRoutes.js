const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

router.get('/', wishlistController.getWishlist);
router.post('/toggle', wishlistController.toggleWishlist);
router.post('/sync', wishlistController.syncWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);

module.exports = router;

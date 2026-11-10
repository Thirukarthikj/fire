const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { isAuthenticated } = require('../middleware/auth');
const { validateAddress } = require('../middleware/validator');

router.use(isAuthenticated);

router.get('/', addressController.getAddresses);
router.post('/', validateAddress, addressController.createAddress);
router.put('/:id', validateAddress, addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.put('/:id/default', addressController.setDefaultAddress);

module.exports = router;


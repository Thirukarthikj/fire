const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

router.get('/home', contentController.getHomeContent);
router.get('/banners', contentController.getBanners);
router.get('/faqs', contentController.getFaqs);
router.get('/policies/:type', contentController.getPolicy);
router.get('/contact', contentController.getContact);

module.exports = router;


const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { isAuthenticated } = require('../middleware/auth');

// Public contact & inquiry endpoint - stores guest and user messages in MongoDB
router.post('/inquiry', supportController.createInquiry);

// Authenticated ticket management routes
router.use(isAuthenticated);

router.get('/', supportController.getTickets);
router.post('/', supportController.createTicket);
router.get('/:id', supportController.getTicketById);
router.post('/:id/reply', supportController.replyTicket);

module.exports = router;


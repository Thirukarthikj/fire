const SupportTicket = require('../models/SupportTicket');

// GET /api/support
exports.getTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .populate('order', 'orderNumber total status')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/support
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, message, category, orderId, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject: subject.trim(),
      category: category || 'other',
      priority: priority || 'medium',
      order: orderId || undefined,
      messages: [
        {
          sender: 'customer',
          senderName: req.user.name,
          message: message.trim(),
          timestamp: new Date()
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/support/:id
exports.getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({ _id: id, user: req.user._id })
      .populate('order', 'orderNumber total status');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/support/:id/reply
exports.replyTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    const ticket = await SupportTicket.findOne({ _id: id, user: req.user._id });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot reply to a closed ticket' });
    }

    ticket.messages.push({
      sender: 'customer',
      senderName: req.user.name,
      message: message.trim(),
      timestamp: new Date()
    });

    if (ticket.status === 'resolved') {
      ticket.status = 'in-progress';
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/support/inquiry (Public - stores all contact inquiries in MongoDB)
exports.createInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, subject, category, message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const senderName = (req.user && req.user.name) || name || 'Festive Guest';
    const senderEmail = (req.user && req.user.email) || email || '';
    const senderPhone = (req.user && req.user.phone) || phone || '';

    const ticket = await SupportTicket.create({
      user: req.user ? req.user._id : undefined,
      guestName: senderName,
      guestEmail: senderEmail,
      guestPhone: senderPhone,
      subject: (subject || 'General Sivakasi Wholesale Inquiry').trim(),
      category: category || 'other',
      priority: 'medium',
      messages: [
        {
          sender: 'customer',
          senderName,
          message: message.trim(),
          timestamp: new Date()
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been stored successfully in MongoDB.',
      data: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};


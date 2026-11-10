const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned'
];

const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
];

const TICKET_STATUSES = [
  'open',
  'in-progress',
  'resolved',
  'closed'
];

const USER_ROLES = [
  'customer',
  'admin',
  'superadmin'
];

const VALID_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: []
};

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  MAX_FILES_PER_UPLOAD: 5
};

module.exports = {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  TICKET_STATUSES,
  USER_ROLES,
  VALID_STATUS_TRANSITIONS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  UPLOAD_LIMITS
};


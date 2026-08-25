const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const logger = require('../logger');

// Soft auth: attaches req.user if a valid cookie exists, but never blocks the request
function softAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies.token;
    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded.user;
    }
  } catch (e) {
    // ignore invalid/expired token for guest checkout
  }
  next();
}

function generateOrderNumber() {
  return 'LOTUS-' + Math.floor(100000 + Math.random() * 900000);
}

// POST /api/orders - create order (guest checkout allowed)
router.post('/', softAuth, async (req, res) => {
  try {
    const { items, customer, paymentMethod, subtotal, discount, shipping, total } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    if (!customer || !customer.name || !customer.email || !customer.phone || !customer.address) {
      return res.status(400).json({ message: 'Complete customer details are required' });
    }

    let orderNumber = generateOrderNumber();
    // Ensure uniqueness (very unlikely collision, but check once)
    const existing = await Order.findOne({ orderNumber });
    if (existing) orderNumber = generateOrderNumber();

    const order = new Order({
      orderNumber,
      user: req.user ? req.user.id : null,
      items,
      customer,
      paymentMethod: paymentMethod || 'cod',
      subtotal: subtotal || 0,
      discount: discount || 0,
      shipping: shipping || 0,
      total: total || 0,
    });

    await order.save();
    res.status(201).json({ order });
  } catch (err) {
    logger.error('Create order error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/mine - logged-in user's own orders
router.get('/mine', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    logger.error('List own orders error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders - admin only, all orders
router.get('/', auth, admin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('user', 'username');
    res.json(orders);
  } catch (err) {
    logger.error('List all orders error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id/status - admin only
router.put('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    logger.error('Update order status error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

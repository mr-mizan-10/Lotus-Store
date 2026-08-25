const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Offer = require('../models/Offer');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const logger = require('../logger');

// GET /api/admin/stats - dashboard overview numbers
router.get('/stats', auth, admin, async (req, res) => {
  try {
    const now = new Date();
    const [userCount, productCount, orders, offerCount, activeOfferCount] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.find(),
      Offer.countDocuments(),
      Offer.countDocuments({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
    ]);

    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingOrders = orders.filter((o) => o.status === 'pending').length;

    res.json({
      userCount,
      productCount,
      orderCount: orders.length,
      pendingOrders,
      totalRevenue,
      offerCount,
      activeOfferCount,
      recentOrders: orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    });
  } catch (err) {
    logger.error('Admin stats error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users - list all users
router.get('/users', auth, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    logger.error('Admin list users error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/role - promote/demote a user
router.put('/users/:id/role', auth, admin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role value' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    logger.error('Admin update role error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    logger.error('Admin delete user error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

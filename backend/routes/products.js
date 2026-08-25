const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const logger = require('../logger');

// GET /api/products - public, list active products
router.get('/', async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.category && req.query.category !== 'all') {
      filter.category = new RegExp('^' + req.query.category.trim() + '$', 'i');
    }
    const sortOrder = req.query.sort === 'desc' ? -1 : 1;
    const products = await Product.find(filter).sort({ createdAt: sortOrder });
    res.json(products);
  } catch (err) {
    logger.error('List products error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/all - admin only, includes inactive
router.get('/all', auth, admin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: 1 });
    res.json(products);
  } catch (err) {
    logger.error('List all products error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/:id - public (supports ObjectId, numeric fallback index, image filename/key, or name)
router.get('/:id', async (req, res) => {
  try {
    const param = req.params.id.trim();
    let product = null;

    // 1. Try finding by MongoDB ObjectId if valid format
    if (/^[0-9a-fA-F]{24}$/.test(param)) {
      product = await Product.findById(param);
    }

    // 2. If param is a numeric index (1..19), map to known static image conventions
    if (!product && /^\d+$/.test(param)) {
      const num = parseInt(param, 10);
      let targetPattern = null;
      if (num >= 1 && num <= 8) {
        targetPattern = new RegExp(`[/\\\\]f${num}\\.jpg$`, 'i');
      } else if (num >= 9 && num <= 19) {
        targetPattern = new RegExp(`[/\\\\]n${num - 8}\\.jpg$`, 'i');
      }
      if (targetPattern) {
        product = await Product.findOne({ image: targetPattern });
      }
    }

    // 3. Search by exact image basename or exact name
    if (!product) {
      const escaped = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      product = await Product.findOne({
        $or: [
          { image: new RegExp(`[/\\\\]${escaped}(\\.[^.]+)?$`, 'i') },
          { name: new RegExp(`^${escaped}$`, 'i') }
        ]
      });
    }

    // 4. If not found, try broader search by image path, key (e.g. 'n11', 'f1'), or name
    if (!product) {
      const regex = new RegExp(param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      product = await Product.findOne({
        $or: [
          { image: regex },
          { name: regex }
        ]
      });
    }

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    logger.error('Get product error', { message: err.message });
    res.status(404).json({ message: 'Product not found' });
  }
});

// POST /api/products - admin only
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, price, image, description, category, rating, stock } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Name and price are required' });
    }
    const product = new Product({ name, price, image, description, category, rating, stock });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    logger.error('Create product error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/products/:id - admin only
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const updates = (({ name, price, image, description, category, rating, stock, active }) =>
      ({ name, price, image, description, category, rating, stock, active }))(req.body);

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    logger.error('Update product error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/products/:id - admin only
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    logger.error('Delete product error', { message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

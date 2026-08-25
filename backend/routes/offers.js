const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const logger = require('../logger');

// Helper to validate offer payloads
function validateOfferPayload(body) {
  const { title, discountType, discountValue, startDate, endDate } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return 'Offer title is required';
  }

  const type = discountType || 'percentage';
  if (!['percentage', 'fixed'].includes(type)) {
    return 'Discount type must be percentage or fixed';
  }

  const numVal = Number(discountValue);
  if (isNaN(numVal) || numVal < 0) {
    return 'Discount value must be a non-negative number';
  }

  if (type === 'percentage' && numVal > 100) {
    return 'Percentage discount cannot exceed 100%';
  }

  if (!startDate || isNaN(new Date(startDate).getTime())) {
    return 'A valid start date is required';
  }

  if (!endDate || isNaN(new Date(endDate).getTime())) {
    return 'A valid end date is required';
  }

  if (new Date(endDate) < new Date(startDate)) {
    return 'End date cannot be earlier than start date';
  }

  return null;
}

// GET /api/offers - Public, list active customer offers (isActive === true and current date within range)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ createdAt: -1 });

    res.json(offers);
  } catch (err) {
    logger.error('List active offers error', { message: err.message });
    res.status(500).json({ message: 'Server error loading active offers' });
  }
});

// GET /api/offers/all - Admin only, list all offers (active, inactive, scheduled, expired)
router.get('/all', auth, admin, async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    logger.error('List all offers error', { message: err.message });
    res.status(500).json({ message: 'Server error loading offers' });
  }
});

// GET /api/offers/validate-coupon/:code - Public, validate coupon code against active offers
router.get('/validate-coupon/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Coupon code is required' });
    }

    const now = new Date();
    const offer = await Offer.findOne({
      couponCode: code,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!offer) {
      return res.status(404).json({ valid: false, message: 'Invalid or expired coupon code' });
    }

    res.json({
      valid: true,
      couponCode: offer.couponCode,
      title: offer.title,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      offerId: offer._id,
    });
  } catch (err) {
    logger.error('Validate coupon error', { message: err.message });
    res.status(500).json({ valid: false, message: 'Error validating coupon' });
  }
});

// GET /api/offers/:id - Get single offer details
router.get('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json(offer);
  } catch (err) {
    res.status(404).json({ message: 'Offer not found' });
  }
});

// POST /api/offers - Admin only, create new offer
router.post('/', auth, admin, async (req, res) => {
  try {
    const validationError = validateOfferPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const {
      title,
      description,
      discountType,
      discountValue,
      bannerImage,
      couponCode,
      startDate,
      endDate,
      isActive,
    } = req.body;

    const offer = new Offer({
      title: title.trim(),
      description: (description || '').trim(),
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      bannerImage: (bannerImage || '').trim(),
      couponCode: (couponCode || '').trim().toUpperCase(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await offer.save();
    logger.info(`Offer created: ${offer.title} (${offer._id})`);
    res.status(201).json(offer);
  } catch (err) {
    logger.error('Create offer error', { message: err.message });
    res.status(500).json({ message: 'Failed to create offer' });
  }
});

// PUT /api/offers/:id - Admin only, update offer
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const validationError = validateOfferPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const {
      title,
      description,
      discountType,
      discountValue,
      bannerImage,
      couponCode,
      startDate,
      endDate,
      isActive,
    } = req.body;

    const updates = {
      title: title.trim(),
      description: (description || '').trim(),
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      bannerImage: (bannerImage || '').trim(),
      couponCode: (couponCode || '').trim().toUpperCase(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      updatedAt: Date.now(),
    };

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    logger.info(`Offer updated: ${offer.title} (${offer._id})`);
    res.json(offer);
  } catch (err) {
    logger.error('Update offer error', { message: err.message });
    res.status(500).json({ message: 'Failed to update offer' });
  }
});

// PATCH /api/offers/:id/toggle - Admin only, toggle active/inactive status
router.patch('/:id/toggle', auth, admin, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    if (req.body.isActive !== undefined) {
      offer.isActive = Boolean(req.body.isActive);
    } else {
      offer.isActive = !offer.isActive;
    }

    offer.updatedAt = Date.now();
    await offer.save();

    logger.info(`Offer status toggled: ${offer.title} -> isActive: ${offer.isActive}`);
    res.json(offer);
  } catch (err) {
    logger.error('Toggle offer status error', { message: err.message });
    res.status(500).json({ message: 'Failed to toggle offer status' });
  }
});

// DELETE /api/offers/:id - Admin only, delete offer
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    logger.info(`Offer deleted: ${offer.title} (${offer._id})`);
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    logger.error('Delete offer error', { message: err.message });
    res.status(500).json({ message: 'Failed to delete offer' });
  }
});

module.exports = router;

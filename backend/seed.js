// One-time setup script.
// Usage:  node seed.js
// Creates an admin account (admin / admin123 by default — CHANGE THE PASSWORD AFTER FIRST LOGIN)
// and imports the 16 products and default promotional offers into the database.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Product = require('./models/Product');
const Offer = require('./models/Offer');

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';

const products = [
  { name: 'Premium Floral Shirt', price: 2499, rating: 5, category: 'Shirts', image: 'img/products/f1.jpg', description: 'A premium floral shirt made with soft, breathable fabric. A clean modern fit for casual and smart-casual looks.' },
  { name: 'Tropical Printed Shirt', price: 2199, rating: 4, category: 'Shirts', image: 'img/products/f2.jpg', description: 'A relaxed tropical printed shirt designed for comfortable everyday wear and summer styling.' },
  { name: 'Vintage Floral Shirt', price: 2699, rating: 5, category: 'Shirts', image: 'img/products/f3.jpg', description: 'A vintage-inspired floral shirt with a stylish print and comfortable fit for weekend outfits.' },
  { name: 'Casual Summer Shirt', price: 2399, rating: 4, category: 'Shirts', image: 'img/products/f4.jpg', description: 'A lightweight casual shirt made for warm days, easy layering and everyday comfort.' },
  { name: 'Classic Cotton Shirt', price: 1899, rating: 4, category: 'Shirts', image: 'img/products/f5.jpg', description: 'A classic cotton shirt with a clean look, soft feel and versatile styling.' },
  { name: 'Modern Blue Shirt', price: 2599, rating: 5, category: 'Shirts', image: 'img/products/f6.jpg', description: 'A modern blue shirt with a smart silhouette for casual and semi-formal outfits.' },
  { name: 'Luxury Printed Shirt', price: 2899, rating: 5, category: 'Shirts', image: 'img/products/f7.jpg', description: 'A premium printed shirt with a bold design, comfortable fabric and polished finish.' },
  { name: 'Stylish Black Shirt', price: 2799, rating: 4, category: 'Shirts', image: 'img/products/f8.jpg', description: 'A stylish black shirt with a minimal modern look that pairs easily with jeans or trousers.' },
  { name: 'Urban Print Shirt', price: 2499, rating: 5, category: 'Shirts', image: 'img/products/n1.jpg', description: 'A contemporary printed shirt designed for relaxed streetwear and everyday styling.' },
  { name: 'Navy Casual Shirt', price: 1999, rating: 4, category: 'Shirts', image: 'img/products/n2.jpg', description: 'A versatile navy shirt with a comfortable fit and timeless everyday appeal.' },
  { name: 'Premium Pattern Shirt', price: 2999, rating: 5, category: 'Shirts', image: 'img/products/n3.jpg', description: 'A premium pattern shirt featuring a distinctive design and comfortable modern cut.' },
  { name: 'Classic White Pattern Shirt', price: 2299, rating: 4, category: 'Shirts', image: 'img/products/n4.jpg', description: 'A clean classic shirt with a subtle pattern, ideal for smart-casual occasions.' },
  { name: 'Everyday Comfort Shirt', price: 2099, rating: 5, category: 'Shirts', image: 'img/products/n5.jpg', description: 'A soft everyday shirt built for comfort, easy movement and effortless styling.' },
  { name: 'Minimal Casual Shirt', price: 2399, rating: 4, category: 'Shirts', image: 'img/products/n6.jpg', description: 'A minimalist casual shirt with a refined look for everyday outfits.' },
  { name: 'Premium Street Shirt', price: 3199, rating: 5, category: 'Shirts', image: 'img/products/n7.jpg', description: 'A premium streetwear-inspired shirt with a bold visual style and modern fit.' },
  { name: 'Signature Lotus Shirt', price: 2799, rating: 4, category: 'Shirts', image: 'img/products/n8.jpg', description: 'A signature Lotus Store shirt combining contemporary design with comfortable everyday wear.' },
  { name: "Men's Casual Ripped Denim Shorts", price: 1200, rating: 5, category: 'Shorts', image: 'img/products/n9.jpg', description: 'Upgrade your casual summer style with these classic ripped denim shorts. Made from high-quality stretch denim, they offer maximum comfort and a modern street-style look.' },
  { name: 'Premium Black Slim-Fit Chino Pant', price: 1999, rating: 5, category: 'Pants', image: 'img/products/n10.jpg', description: 'Classic black chino pants designed for everyday comfort and a clean, stylish look. The soft cotton-blend fabric is breathable and durable.' },
  { name: "Men's Premium Maroon Embroidered Panjabi", price: 2999, rating: 5, category: 'Panjabi', image: 'img/products/n11.jpg', description: 'Fabric: High-quality Premium Cotton / Cotton-Linen blend. Design: Intricate neckline and cuff embroidery with a modern band collar (Mandarin collar). Perfect for Eid & festivities.' },
];

const sampleOffers = [
  {
    title: 'Eid Mega Sale',
    description: 'Get amazing discounts on all premium shirts & accessories.',
    discountType: 'percentage',
    discountValue: 30,
    bannerImage: 'img/banner/b2.jpg',
    couponCode: 'EID30',
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // started yesterday
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // ends in 30 days
    isActive: true,
  },
  {
    title: 'Summer Fashion Festival',
    description: 'Flat ৳500 discount on select summer apparel collections.',
    discountType: 'fixed',
    discountValue: 500,
    bannerImage: 'img/banner/b17.jpg',
    couponCode: 'SUMMER500',
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    isActive: true,
  }
];

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set in backend/.env — cannot seed.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // --- Admin user ---
  let admin = await User.findOne({ username: ADMIN_USERNAME });
  if (admin) {
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
      console.log(`Existing user "${ADMIN_USERNAME}" promoted to admin.`);
    } else {
      console.log(`Admin user "${ADMIN_USERNAME}" already exists — skipping.`);
    }
  } else {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);
    admin = new User({ username: ADMIN_USERNAME, password: hash, role: 'admin' });
    await admin.save();
    console.log(`Created admin user -> username: "${ADMIN_USERNAME}"  password: "${ADMIN_PASSWORD}"`);
    console.log('IMPORTANT: log in and change this password, or set SEED_ADMIN_PASSWORD before seeding.');
  }

  // --- Products ---
  for (const p of products) {
    await Product.findOneAndUpdate(
      { image: p.image },
      { $set: p },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  const totalProds = await Product.countDocuments();
  console.log(`Synced products catalog. Total active products in DB: ${totalProds}`);

  // --- Offers ---
  const existingOffers = await Offer.countDocuments();
  if (existingOffers > 0) {
    console.log(`Offers collection already has ${existingOffers} item(s) — skipping offer import.`);
  } else {
    await Offer.insertMany(sampleOffers);
    console.log(`Imported ${sampleOffers.length} default offers.`);
  }

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

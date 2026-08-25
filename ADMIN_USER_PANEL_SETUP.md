# Lotus Store — Admin Panel + User Panel সেটআপ গাইড

## যা যা নতুন যোগ হলো

### Backend (`/backend`)
- `models/User.js` — `role` ফিল্ড (`user` / `admin`) যোগ হয়েছে
- `models/Product.js`, `models/Order.js` — নতুন মডেল
- `routes/products.js` — `/api/products` (পাবলিক GET, admin-only POST/PUT/DELETE)
- `routes/orders.js` — `/api/orders` (checkout করলে অর্ডার সেভ হয়, admin সব অর্ডার দেখতে/status বদলাতে পারবে)
- `routes/admin.js` — `/api/admin/stats`, `/api/admin/users` (dashboard stats, ইউজার role change/delete)
- `middleware/admin.js` — শুধু admin role হলে পাস করে
- `seed.js` — প্রথমবার চালালে একটা admin অ্যাকাউন্ট বানাবে এবং পুরনো ১৬টা প্রোডাক্ট DB-তে ইমপোর্ট করবে

### Frontend
- `subpages/admin.html` + `CSS/admin.css` + `js/admin.js` → **সম্পূর্ণ Admin Panel** (Overview stats, Product Add/Edit/Delete, Order status বদলানো, User role/delete ম্যানেজমেন্ট)
- `subpages/dashboard.html` + `js/dashboard.js` → **User Dashboard** এখন real backend data দেখায় (নিজের অর্ডার হিস্ট্রি)
- `js/script.js` → লগইনের সময় admin হলে সরাসরি Admin Panel-এ রিডাইরেক্ট হবে, **shop.html ও index.html-এর প্রোডাক্ট গ্রিড এখন সম্পূর্ণ ডাইনামিক** — backend থেকে লোড হয় এবং admin panel থেকে প্রোডাক্ট Add/Edit/Delete করলে সাথে সাথে storefront-এ প্রতিফলিত হয় (backend বন্ধ থাকলে আগের মতো hardcoded লিস্ট fallback হিসেবে কাজ করবে), checkout করলে real order তৈরি হয়

## চালু করবেন কীভাবে

### ১. Backend সেটআপ
```bash
cd backend
npm install
cp .env.example .env
```
`.env` ফাইলে অন্তত এই দুটো লাইন ঠিক করুন:
```
MONGO_URI=mongodb://localhost:27017/lotus
JWT_SECRET=একটা-লম্বা-র‍্যান্ডম-সিক্রেট
```
(লোকাল মেশিনে MongoDB না থাকলে [MongoDB Atlas](https://www.mongodb.com/atlas)-এর ফ্রি ক্লাস্টার থেকে একটা `MONGO_URI` নিতে পারেন)

### ২. প্রথম Admin অ্যাকাউন্ট + প্রোডাক্ট সিড করুন
```bash
npm run seed
```
এটা তৈরি করবে:
- Username: `admin`, Password: `admin123` (চাইলে `.env`-এ `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` দিয়ে বদলাতে পারবেন)
- আগের ১৬টা প্রোডাক্ট DB-তে যোগ হবে

**⚠️ প্রথমবার লগইন করেই পাসওয়ার্ড বদলে ফেলুন — ডেমো পাসওয়ার্ড production-এ রাখবেন না।**

### ৩. সার্ভার চালু করুন
```bash
npm run dev
```
Backend চলবে `http://localhost:5000`-এ।

### ৪. ফ্রন্টএন্ড চালু করুন
`index.html` কে যেকোনো static server (Live Server / `npx serve` ইত্যাদি) দিয়ে খুলুন — পোর্ট `5500`, `3000`, `8080` বা `5000` হলে CORS ঠিকমতো কাজ করবে।

### ৫. টেস্ট করুন
1. সাইটে গিয়ে "Sign In" → username: `admin`, password: `admin123` দিয়ে লগইন করুন
2. স্বয়ংক্রিয়ভাবে **Admin Panel**-এ রিডাইরেক্ট হবে (`subpages/admin.html`)
3. Products ট্যাবে গিয়ে প্রোডাক্ট Add/Edit/Delete করে দেখুন
4. একটা নতুন সাধারণ ইউজার দিয়ে রেজিস্টার করে shop থেকে অর্ডার করুন
5. Admin Panel-এর Orders ট্যাবে সেই অর্ডার দেখা যাবে, status বদলাতে পারবেন
6. ওই ইউজার দিয়ে লগইন করে **User Dashboard**-এ (`subpages/dashboard.html`) নিজের অর্ডার হিস্ট্রি দেখুন

## সীমাবদ্ধতা (জেনে রাখা ভালো)
- Wishlist, Reward Points, Saved Addresses — এগুলো এখনো ডেমো ডেটা (backend সংযোগ নেই)।
- নতুন কোনো প্রোডাক্ট ছবি আপলোড করার UI নেই — Admin Panel-এ ছবি যোগ করতে `img/products/` ফোল্ডারে ফাইল রেখে সেই path (যেমন `img/products/new1.jpg`) ফর্মে লিখতে হবে।

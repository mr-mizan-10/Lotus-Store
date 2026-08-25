# Lotus Store — Deployment Guide

This guide walks through deploying Lotus Store publicly:

```
Browser
   ↓
Render Static Site (frontend: HTML/CSS/JS)
   ↓  (HTTPS, fetch calls)
Render Web Service (backend: Node.js/Express, lotus-store/backend)
   ↓
MongoDB Atlas (cloud database)
```

The frontend and backend are deployed as **two separate Render services** because the
frontend is plain static HTML/CSS/JS (no build step) and the backend is a Node/Express API.

---

## 1. MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas and create a free account (or sign in).
2. Create a new **Cluster** (the free M0 tier is fine to start).
3. **Database Access** → Add New Database User:
   - Choose a username (e.g. `lotus_app`).
   - Generate/enter a strong password and **save it somewhere safe** — you'll need it for the connection string.
   - Give the user **Read and write to any database** (or scope it to your database only).
4. **Network Access** → Add IP Address:
   - For Render (which uses dynamic outbound IPs on the free/standard plans), the practical option is **Allow Access From Anywhere** (`0.0.0.0/0`).
   - This is safe here because the database itself is still protected by the username/password, and the connection string is never exposed to the frontend or committed to Git. If you upgrade to a Render plan with static outbound IPs later, you can restrict this to just those IPs.
5. **Database** → Connect → Drivers → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with the values from step 3, and add your database name before the `?`, e.g.:
   ```
   mongodb+srv://lotus_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/lotus?retryWrites=true&w=majority
   ```
   This full string is your `MONGO_URI` — keep it private, you'll paste it only into Render's environment variable settings (never into code or `.env.example`).

---

## 2. GitHub

From the project root (the folder containing `backend/`, `index.html`, `subpages/`, etc.):

```bash
git init
git add .
git commit -m "Production-ready Lotus Store"
```

Then create a new repository on https://github.com/new (don't initialize it with a README), and:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

`backend/.env` will **not** be pushed — it's excluded by `backend/.gitignore` and the root `.gitignore`. Verify this yourself before pushing:

```bash
git status
```

`backend/.env` should **not** appear in the list of files to be committed. If it does, stop and check your `.gitignore` before pushing.

---

## 3. Render — Backend (Web Service)

1. Go to https://dashboard.render.com → **New** → **Web Service**.
2. Connect your GitHub repository.
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | your MongoDB Atlas connection string from step 1 |
   | `JWT_SECRET` | a long random string (Render can auto-generate one, or run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` locally) |
   | `FRONTEND_URL` | your Render **frontend** URL — you'll fill this in after step 4, e.g. `https://lotus-store.onrender.com` |
   | `PORT` | Render sets this automatically; you don't need to add it |
5. Deploy. Once live, note your backend URL, e.g. `https://lotus-store-backend.onrender.com`.
6. Confirm it's up: visit `https://lotus-store-backend.onrender.com/api/health` — you should see `{"status":"ok",...}`.

---

## 4. Render — Frontend (Static Site)

1. **Dashboard** → **New** → **Static Site**.
2. Connect the same GitHub repository.
3. Configure:
   - **Root Directory**: leave blank (repo root, where `index.html` lives) — or set it to wherever `index.html` sits if your repo has a different layout.
   - **Build Command**: leave blank (no build step needed for plain HTML/CSS/JS).
   - **Publish Directory**: `.` (the root directory containing `index.html`)
4. Deploy. Note the resulting URL, e.g. `https://lotus-store.onrender.com`.

---

## 5. Connect Frontend to Backend

Open `js/config.js` in your repo and set:

```js
PRODUCTION_API_URL: 'https://lotus-store-backend.onrender.com',
```

(use your **actual** backend URL from step 3). Commit and push this change — Render will auto-redeploy the static site.

Then go back to your **backend** service on Render and set/update the `FRONTEND_URL` environment variable to your **actual** frontend URL from step 4, then save (Render will restart the backend with the new value). This is required for CORS and cookie-based login to work across the two domains.

---

## 6. Final Testing Checklist

Visit your live frontend URL and verify:

- [ ] Homepage loads (banners, products, images)
- [ ] User registration works
- [ ] User login works (and stays logged in on refresh)
- [ ] User logout works
- [ ] Shop / product listing pages load products from the API
- [ ] Single product page loads
- [ ] Add to cart / cart page works
- [ ] Checkout submits an order successfully
- [ ] Admin login works (`/subpages/admin.html`)
- [ ] Admin dashboard shows stats
- [ ] Admin can create/edit/delete a product
- [ ] Admin can view and update order status
- [ ] Admin can view/manage users
- [ ] Browser console shows no CORS or network errors
- [ ] Backend logs (Render → your backend service → Logs) show no repeated errors

If admin login fails because there's no admin account yet, run the seed script **once**, locally, pointed at your Atlas database:

```bash
cd backend
MONGO_URI="your-atlas-connection-string" SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD="a-strong-password" node seed.js
```

Then log in with those credentials and **change the password** via your own account settings if the app supports it, or by creating a new admin user and deleting the seed one.

---

## Notes on What Was Already Production-Ready

This project had already been through a prior hardening pass before this review. In particular:
- `PORT` is read from `process.env.PORT` with a sensible fallback — no changes needed.
- `MONGO_URI` is required in production and the server fails fast with a clear log message if it's missing (verified locally during this audit).
- `JWT_SECRET` has no insecure fallback — the app refuses to issue/verify tokens without it.
- CORS is environment-driven via `FRONTEND_URL`/`CLIENT_URL` and does not use `origin: '*'` with credentials.
- Cookies are `httpOnly`, and `secure`/`sameSite` automatically tighten based on `NODE_ENV`.
- All write endpoints (products, orders, offers, admin) are protected by `auth` + `admin` middleware; only safe read endpoints are public.
- Passwords are hashed with bcrypt; error responses never leak stack traces (only server-side logs do).
- `.gitignore` already excludes `.env`, `node_modules/`, and `logs/`.
- A `/api/health` endpoint already exists.
- `js/config.js` already centralizes the frontend API URL, with per-page scripts falling back to it correctly.


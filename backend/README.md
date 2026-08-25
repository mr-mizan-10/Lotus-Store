# Lotus Backend

Express + MongoDB backend providing simple auth endpoints (`/api/auth/register` and `/api/auth/login`).

Quick start:

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file (see `.env.example`) and set `MONGO_URI` and `JWT_SECRET`.

3. Run in development:

```bash
npm run dev
```

Endpoints:
- `POST /api/auth/register` { username, password }
- `POST /api/auth/login` { username, password } -> sets HTTP-only cookie `token` and returns `user`
- `GET /api/auth/me` -> returns current user (reads `token` from HTTP-only cookie)
- `POST /api/auth/logout` -> clears cookie

Notes:
- The server sends the JWT in an HTTP-only cookie named `token`. Configure the client origin via the `CLIENT_URL` environment variable (defaults to `http://localhost:5500`).

# Eco-Garbage — Production Deployment Guide

This guide takes you from "running locally" to "I can open it on my phone".

Stack: **Render (backend + frontend hosting)** + **MongoDB Atlas (database)**.
Both providers have a free tier, so you can deploy this without paying anything.

---

## 0. Before you start

You need:

- A GitHub account (Render pulls your code from GitHub)
- A MongoDB Atlas account (free): https://www.mongodb.com/cloud/atlas/register
- A Render account (free): https://dashboard.render.com/register
- Git installed on your computer

Estimated time: **30–45 minutes**.

---

## 1. Push the project to GitHub

> If your project is already on GitHub you can skip this step.

```bash
cd "C:\Users\Sanogo ceo\OneDrive\Desktop\Eco-Garbage\Eco-Garbage"

git init
git add .
git commit -m "Initial commit - production ready"
```

Create a new **empty private repo** on GitHub called `eco-garbage`, then:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/eco-garbage.git
git push -u origin main
```

> Make sure `node_modules` and `.env` are NOT pushed — the `.gitignore` we set up handles that.

---

## 2. Create your MongoDB Atlas cluster (5 min)

1. Sign in at https://cloud.mongodb.com
2. **Create a Project** → name it `eco-garbage`.
3. **Build a Database** → choose **M0 (Free)** → pick a region close to you → **Create Deployment**.
4. **Database Access** → **Add New Database User**
   - username: `eco_garbage_app`
   - password: click *Autogenerate* and **copy it somewhere safe**.
   - role: **Atlas admin** (you can lock this down later).
5. **Network Access** → **Add IP Address** → click **Allow access from anywhere** (`0.0.0.0/0`). This is required so Render can reach the DB.
6. **Database** → **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://eco_garbage_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<password>` with the one you saved, and add the database name `eco_garbage_db` before the `?`:
   ```
   mongodb+srv://eco_garbage_app:MyStrongPwd@cluster0.xxxxx.mongodb.net/eco_garbage_db?retryWrites=true&w=majority
   ```
   Keep this URI — you'll paste it into Render in step 3.

---

## 3. Deploy on Render (10 min)

There are two ways. The Blueprint way is easier.

### Option A — One-click Blueprint (recommended)

1. Go to https://dashboard.render.com/blueprints → **New Blueprint Instance**.
2. Connect your GitHub account and pick your `eco-garbage` repo.
3. Render reads `render.yaml` automatically and shows two services to create:
   - `eco-garbage-backend` (Web Service)
   - `eco-garbage-frontend` (Static Site)
4. It will ask for the env vars that have `sync: false`. Fill them in:

   **Backend (`eco-garbage-backend`):**
   | Key            | Value                                                                   |
   | -------------- | ----------------------------------------------------------------------- |
   | `MONGO_URI`    | the Atlas URI from step 2                                               |
   | `FRONTEND_URL` | leave blank for now — we'll set it after step 3                         |
   | `MAIL_*`       | leave blank if you don't need email yet (verification emails won't send)|

   **Frontend (`eco-garbage-frontend`):**
   | Key             | Value                                                  |
   | --------------- | ------------------------------------------------------ |
   | `VITE_API_URL`  | leave blank for now (we'll set it in step 4)           |

5. Click **Apply**. Render starts building both services.
6. After ~3 minutes the **backend** finishes. Open its URL — should look like:
   `https://eco-garbage-backend.onrender.com`
   Visit `/health` — you should see `{ "status": "ok", ... }`.

### Option B — Create services manually

If the Blueprint flow fails, create them by hand:

- **Backend**: New → Web Service → connect repo → root dir `Eco-Garbage/backend`, build `npm install`, start `npm start`, health check `/health`. Add env vars from `backend/.env.example`.
- **Frontend**: New → Static Site → connect repo → root dir `Eco-Garbage/frontend`, build `npm install && npm run build`, publish dir `dist`. Add `VITE_API_URL`.

---

## 4. Wire the two services together (3 min)

Once both URLs exist (you'll see them at the top of each service's page):

1. Go to **frontend** → **Environment** → set
   ```
   VITE_API_URL = https://eco-garbage-backend.onrender.com
   ```
   (use your actual backend URL). Click **Save Changes** → it triggers a redeploy.

2. Go to **backend** → **Environment** → set
   ```
   FRONTEND_URL = https://eco-garbage-frontend.onrender.com
   ```
   (use your actual frontend URL). Click **Save Changes** → it redeploys.

Wait ~2 minutes for both to come back up.

---

## 5. Seed the database (optional)

Your backend ships with a DB init script (`src/config/initDb.js`) for waste categories.
On Render: open the backend service → **Shell** tab → run:

```bash
node src/config/initDb.js
```

---

## 6. Open it on your phone

On your phone, open Safari/Chrome and visit:

```
https://eco-garbage-frontend.onrender.com
```

Sign up as a user, log in, create a pickup request. Everything should work.

**Add to home screen** (so it feels like an app icon, even without PWA):
- iPhone (Safari): Share → "Add to Home Screen"
- Android (Chrome): three-dot menu → "Add to Home screen"

---

## 7. Cold-start note (free tier)

Render's free Web Services **sleep after 15 minutes of inactivity** and take ~30s to wake up.
First request after a pause feels slow; subsequent requests are fast.

To eliminate this, upgrade the backend to the **Starter** plan ($7/month) — no sleep, more RAM. The frontend Static Site is always-on, even on free.

---

## 8. Email setup (optional but recommended)

Without SMTP creds, email verification and password reset links won't send. To enable:

1. Pick a free SMTP provider:
   - **Brevo** (https://www.brevo.com) — 300 emails/day free
   - **Resend** (https://resend.com) — 100 emails/day free
   - **Gmail** — App Passwords (less reliable)
2. Get the SMTP host, port, username, password.
3. In Render → backend → Environment, set:
   ```
   MAIL_HOST=smtp-relay.brevo.com
   MAIL_PORT=587
   MAIL_USER=your-smtp-user
   MAIL_PASS=your-smtp-pass
   MAIL_FROM=no-reply@yourdomain.com
   ```

---

## 9. Persistent uploads (important note)

Render free Web Services use ephemeral disk — files written to `backend/uploads/`
will be **wiped on every redeploy / restart**.

For development that's fine. For production you should switch to object storage:
- **Cloudinary** (free tier, easy with Multer)
- **AWS S3**
- **Backblaze B2** (cheapest)

Tell me when you're ready and I'll wire it in.

---

## 10. Local development (still works)

Nothing about the local dev flow changed. Both frontend and backend still run as before:

```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Quick troubleshooting

| Symptom                                              | Fix                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Frontend loads but API calls 404 / CORS error        | `VITE_API_URL` not set on frontend, or `FRONTEND_URL` not set on backend. Both must match.   |
| "MongoServerSelectionError"                          | Atlas Network Access doesn't allow `0.0.0.0/0`, or wrong password in MONGO_URI               |
| "FATAL: JWT_SECRET is not set"                       | Set `JWT_SECRET` env var on backend (Blueprint auto-generates it)                            |
| Frontend white screen on `/login` after deploy       | Missing `_redirects` file — already included in `public/_redirects`. Re-deploy.              |
| Map tiles don't load on phone                        | HTTPS only — already handled (both Render services serve HTTPS).                             |
| First request to API takes 30 seconds                | Render free tier cold start (see §7). Upgrade or accept it.                                  |

---

Ready to deploy. If anything breaks, paste the Render log here and I'll debug.

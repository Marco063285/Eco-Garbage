# Eco-Garbage — Backend deployment to Render

Frontend stays on Vercel. Backend (this folder) goes on Render. Database goes on MongoDB Atlas. Estimated time: 25–30 minutes.

---

## 1. MongoDB Atlas (free cluster, ~5 min)

1. Sign up / log in at https://www.mongodb.com/cloud/atlas
2. **Create a cluster** → choose **M0 Free** tier → pick a region close to your Render region (Frankfurt if you keep the default in `render.yaml`).
3. **Database Access** → Add New Database User → username + strong password. Save them.
4. **Network Access** → Add IP Address → **Allow Access From Anywhere** (`0.0.0.0/0`). Render does not give a fixed IP on the free plan, so this is required.
5. **Database** → **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Add the database name **before** the `?`:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/eco_garbage_db?retryWrites=true&w=majority
   ```
   Replace `<user>` and `<password>` with the credentials from step 3. **URL-encode the password** if it contains special characters (e.g. `@` → `%40`).

Keep this connection string — you'll paste it into Render in step 3.

---

## 2. Push the latest changes to GitHub

Your repo already exists. From the repo root:

```bash
git add Eco-Garbage/backend Eco-Garbage/frontend/src/services/api.js
git commit -m "Prepare backend for Render deployment"
git push
```

Files added/changed in this session:
- `backend/src/server.js` — CORS now accepts your Vercel URL + previews, trust proxy enabled, `/` root route added.
- `backend/package.json` — added `engines.node` ≥ 18.
- `backend/render.yaml` — Render Blueprint.
- `backend/.env.example` — production env template.
- `backend/.gitignore` — cleaned up.
- `frontend/src/services/api.js` — reads `VITE_API_URL` so the deployed frontend talks to Render.

---

## 3. Create the Render Web Service (~5 min)

1. Sign up / log in at https://render.com (you can use your GitHub account).
2. Click **New +** → **Web Service**.
3. **Connect a repository** → pick your Eco-Garbage repo.
4. Fill the form:
   - **Name**: `eco-garbage-backend` (becomes part of the URL)
   - **Region**: same as your Atlas cluster
   - **Branch**: `main` (or whichever you push to)
   - **Root Directory**: `Eco-Garbage/backend`  ← **important**, your code is nested
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Create Web Service**. The first build will fail until you add the env vars — that's expected.

> Alternative: instead of filling the form, choose **New + → Blueprint** and Render will auto-read the committed `render.yaml`. You'll still need to fill the secret env vars in step 4.

---

## 4. Add the environment variables in Render

On your service page → **Environment** → **Add Environment Variable**. Add these (paste real values, no quotes):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | the full Atlas connection string from step 1 |
| `JWT_SECRET` | a long random string (run `openssl rand -hex 64` locally, or use any password manager) |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | your Vercel URL, e.g. `https://eco-garbage.vercel.app` (no trailing slash). Multiple? Comma-separate them. |
| `MAIL_HOST` | your SMTP host (e.g. `sandbox.smtp.mailtrap.io` for testing, or `smtp.gmail.com`) |
| `MAIL_PORT` | `2525` (Mailtrap) or `587` (Gmail) |
| `MAIL_USER` | SMTP username |
| `MAIL_PASS` | SMTP password / app password |
| `MAIL_FROM` | `no-reply@ecogarbage.app` (or your verified sender) |

Do **not** set `PORT` — Render injects it.

Save. Render redeploys automatically.

---

## 5. Verify the backend is live

Wait for the deploy log to show `🚀 Serveur EcoGarbage démarré…` and `✅ MongoDB connectée`. Then open:

```
https://eco-garbage-backend.onrender.com/health
```

You should see JSON like `{"status":"ok","timestamp":"...","version":"1.0.0"}`.

If you get an error, check the **Logs** tab in Render — common issues:
- `❌ Erreur connexion MongoDB` → wrong `MONGO_URI`, or Atlas IP allowlist not set to `0.0.0.0/0`, or password not URL-encoded.
- CORS error in the browser → `FRONTEND_URL` doesn't match your Vercel URL exactly.

---

## 6. Point the Vercel frontend at Render

1. Go to your Vercel project → **Settings** → **Environment Variables**.
2. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://eco-garbage-backend.onrender.com/api`  ← note the `/api` suffix
   - **Environments**: tick **Production**, **Preview**, **Development**
3. **Deployments** → on the latest deployment, click the menu (`⋯`) → **Redeploy** (uncheck "Use existing Build Cache" to be safe).

Once the redeploy is done, your Vercel site is talking to Render.

---

## 7. Test from your phone

1. Open your Vercel URL on your phone's browser. HTTPS is on by default for both Vercel and Render, so the site works on mobile with no extra config.
2. Try logging in / registering. If something fails:
   - Open the browser dev console (Safari iOS: Settings → Safari → Advanced → Web Inspector, then connect to a Mac. Android Chrome: `chrome://inspect` from a desktop Chrome).
   - Look for CORS errors → fix `FRONTEND_URL` in Render.
   - Look for 401/500 → check Render logs.

To install the site like a real app on your phone: open the Vercel URL → browser menu → **Add to Home Screen**. (For a real PWA, the frontend would need a manifest + service worker — say the word if you want that wired up.)

---

## Known production caveats

- **Render free plan sleeps after 15 min of inactivity.** First request after that takes ~30 seconds. A paid plan ($7/mo) keeps it warm. Alternatively, ping `/health` every 10 min from a free uptime monitor (e.g. UptimeRobot).
- **Uploads are ephemeral.** `multer.diskStorage` writes to `./uploads`, which Render wipes on every redeploy. Selfie/ID files uploaded today will be gone tomorrow. For real production, swap to **Cloudinary** (free 25 GB) or **AWS S3** — happy to refactor `routes/index.js` for you, say the word.
- **Email.** Mailtrap sandbox only delivers to your test inbox. For real outbound mail, use Brevo (free 300/day), SendGrid, Resend, or Gmail with an App Password.
- **Secrets rotation.** Anyone who had `eco_garbage_super_secret_jwt_key_2026_changeme` from the old `.env` can forge tokens. Make sure the production `JWT_SECRET` is a fresh random value — never reuse the dev one.

---

## Quick checklist

- [ ] Atlas cluster created, user + IP allowlist done, connection string copied
- [ ] Code pushed to GitHub
- [ ] Render Web Service created with Root Directory `Eco-Garbage/backend`
- [ ] All env vars set in Render (MONGO_URI, JWT_SECRET, FRONTEND_URL, mail vars)
- [ ] `https://<your-service>.onrender.com/health` returns `{"status":"ok"}`
- [ ] `VITE_API_URL` set in Vercel and frontend redeployed
- [ ] Tested login from phone over HTTPS

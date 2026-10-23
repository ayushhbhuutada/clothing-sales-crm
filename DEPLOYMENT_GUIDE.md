# 🚀 Cloud Deployment Guide (Option A)

This guide walks you through deploying your **Retail Customer Profile & Lead Management System** to production in the cloud so staff across any branch or smartphone can securely access it with 100% uptime.

---

## 🌟 Choose Your Cloud Deployment Method

| Method | Best For | Cost | Setup Time |
|---|---|---|---|
| **Method 1: Render.com (Unified Single Service)** *(Recommended)* | Single URL for both Web App & API, 1-Click Blueprints, Built-in Persistent Disk | Free tier / \$7/mo | ~5 minutes |
| **Method 2: Vercel (Frontend) + Railway (Backend)** | Fast global CDN edge deployment | Free tier / \$5/mo | ~8 minutes |
| **Method 3: Docker on any VPS (DigitalOcean / AWS / Linode)** | Total infrastructure control, custom server | \$4–\$6/mo | ~10 minutes |

---

## Method 1: Render.com (Unified Full-Stack Deployment — Recommended)

With this method, Render builds both the React frontend and Node.js backend together and serves them under **one clean URL** (e.g., `https://aura-clothing-crm.onrender.com`), while persisting your SQLite database on a mounted disk.

### Step 1: Push Code to GitHub
1. Initialize git in your project root (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Retail CRM"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g., `clothing-retail-crm`).
3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/clothing-retail-crm.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Log in to [Render.com](https://render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Fill in the settings:
   - **Name**: `aura-clothing-crm` (or your store name)
   - **Language**: `Node`
   - **Branch**: `main`
   - **Region**: Closest to your store (e.g., *Singapore / Frankfurt / Oregon*)
   - **Build Command**:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run dev:backend
     ```
     *(or `node backend/dist/server.js` after build)*
5. **Add Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `JWT_SECRET`: a random string of 32+ characters (**required** — the server refuses to start in production without it). Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
6. **Attach Persistent Disk (Crucial for SQLite Database)**:
   - Scroll down to **Disks** $\rightarrow$ Click **Add Disk**.
   - **Name**: `crm-data`
   - **Mount Path**: `/app/backend/data` (or `./backend/data`)
   - **Size**: `1 GB` (stores millions of customer records and bills).
7. Click **Create Web Service**. Render will build and deploy your app in 2–3 minutes!

---

## Method 2: Vercel (Frontend) + Render / Railway (Backend API)

If you prefer hosting the frontend on Vercel's global CDN:

### Part 1: Deploy Backend on Render / Railway
1. In Render, create a Web Service with **Root Directory** set to `backend`.
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `node dist/server.js`
4. Attach a 1GB persistent disk at `/app/data`.
5. Add environment variables `JWT_SECRET` (32+ random characters) and `CORS_ORIGIN` (your Vercel URL, e.g. `https://aura-crm.vercel.app`; comma-separate several).
6. Note your backend URL (e.g., `https://aura-crm-api.onrender.com`).

### Part 2: Deploy Frontend on Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://aura-crm-api.onrender.com` (your backend URL from Part 1).
6. Click **Deploy**. Vercel will give you a live URL like `https://aura-crm.vercel.app`.

---

## Method 3: Docker Deployment on Any VPS (DigitalOcean / AWS / Linode)

If you have a Linux cloud server (Ubuntu 22.04 / 24.04):

1. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. Clone your repository on the server:
   ```bash
   git clone https://github.com/YOUR_USERNAME/clothing-retail-crm.git
   cd clothing-retail-crm
   ```
3. Build and launch with persistent volume:
   ```bash
   docker build -t clothing-crm .
   docker run -d \
     --name aura-crm \
     -p 80:5000 \
     -v $(pwd)/backend/data:/app/backend/data \
     --restart unless-stopped \
     clothing-crm
   ```
4. Access directly at your server's IP address: `http://YOUR_SERVER_IP`.

---

## 🌐 Custom Domain Setup (e.g., `crm.yourstore.com`)

1. In Render / Vercel / Cloudflare, go to **Settings** $\rightarrow$ **Custom Domains**.
2. Enter your subdomain, e.g. `crm.yourstore.com`.
3. Go to your domain registrar (GoDaddy, Namecheap, Cloudflare) and add a `CNAME` record:
   - **Type**: `CNAME`
   - **Name / Host**: `crm`
   - **Value / Target**: The target provided by Render / Vercel.
4. Free SSL / HTTPS will be provisioned automatically within minutes.

---

## 📱 Setting Up Shop-Floor Devices for Staff

Once deployed to your URL (e.g., `https://crm.yourstore.com`):

1. **Reception Counter (iPad / PC / Tablet)**:
   - Open `https://crm.yourstore.com` in Safari / Chrome.
   - Click the Share button $\rightarrow$ **"Add to Home Screen"** to make it run like a native full-screen app.
   - Log in using Reception PIN `1111`.

2. **Sales Stylists (Personal Smartphones or Floor Tablets)**:
   - Staff open `https://crm.yourstore.com` on their phones or shared floor iPads.
   - Enter their 4-digit PIN (e.g., Rahul: `2222`, Ananya: `3333`, Vikram: `4444`).
   - Tap the Volume icon in the top header once to enable sound chimes.
   - Ready! When the reception assigns a lead, their device will chime and show the customer dossier.

---

## 🔒 Backups & Data Security

- **Daily Database Backup**: The SQLite database file resides at `backend/data/retail.sqlite`. You can download a backup anytime from your server or set up a daily cron script:
  ```bash
  cp backend/data/retail.sqlite backend/data/backups/retail_$(date +%F).sqlite
  ```
- **Universal Spreadsheet Exports**: You can also export your customer and sales data anytime via the **Manager Analytics** dashboard.

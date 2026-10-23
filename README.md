# Aura Couture — Retail Customer Profile & Lead Management System

> **A modern in-store Retail CRM & Lead Routing System tailored for clothing stores and fashion boutiques.**
> Instantly recognizes returning customers by phone number, equips on-floor stylists with past purchase history and style preferences, enables fast lead handoffs with audio chimes, and universally syncs sales data via spreadsheet imports.

---

## ✨ Key Features

- 🛎️ **Sub-Second Phone Lookup (`<50ms`)**: Instant autocomplete, VIP badges, lifetime spend (LTV), visit count, and past invoice highlights.
- 👗 **Customer 360° Style Dossier**: Top/bottom/footwear sizes, color palettes, fabric preferences, budget comfort ranges, timestamped style notes, and returns log.
- 🔔 **Real-Time Shop-Floor Lead Dispatch**: Web Audio chimes and live visual banners alert stylists on tablets/smartphones when a lead is assigned.
- ⚡ **30-Second Style Tagger**: Fast 1-tap chip selector for stylists to record fitting and preference updates during in-store consultations.
- 📥 **Universal Billing & POS Import Pipeline**: Import sales data from **Tally, Marg ERP, Vyapar, Busy, or any CSV/Excel POS register** with custom column mapping, composite row-hash de-duplication, and a *"Needs Review"* queue for cash bills.
- 📊 **Manager Analytics & Retention Radar**: Live footfall vs. conversion funnel, stylist leaderboard, apparel size/category trends, and lapsed VIP customer re-engagement.
- 🔢 **Shop-Floor Touch PIN-Pad**: 0–9 touch keypad for fast staff switching on shared counter tablets.

---

## 🛠️ Tech Stack

- **Frontend**: React 18 (TypeScript), Vite, Tailwind CSS, Lucide Icons, Canvas Confetti, Web Audio API
- **Backend**: Node.js, Express (TypeScript), REST API, Server-Sent Events (SSE) for real-time dispatch
- **Database**: SQLite (Zero-config embedded relational database with persistent disk support)
- **File Parser**: SheetJS (`xlsx`), PapaParse (`csv`)

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm run install:all
```

### 2. Start Development Servers
In two separate terminals:

```bash
# Terminal 1: Backend API (Port 5000)
npm run dev:backend

# Terminal 2: Frontend App (Port 5173)
npm run dev:frontend
```

- Open **[http://localhost:5173](http://localhost:5173)** in your browser or tablet.
- API running at **[http://localhost:5000/api](http://localhost:5000/api)**.

---

## 🔑 Staff Login & Permissions

Staff sign in by selecting their name on the PIN pad and entering their PIN. The server issues a 12-hour session token; every API call (except login and the health check) requires it.

- **Reception / Sales**: customer lookup, profiles, preferences, lead assignment, own leads
- **Store Manager / Admin / Owner**: everything above plus imports, analytics and customer deletion

Demo PINs for the seeded sample store are defined in `backend/src/db/seed.ts` and are hashed on first start. Change them before any real deployment. Production requires `JWT_SECRET` (see `backend/.env.example`).

---

## ☁️ Cloud Deployment

Detailed step-by-step guides for deploying to **Render**, **Vercel**, **Railway**, and **Docker** are available in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

### 1-Click Render.com Blueprint
This repository includes a [`render.yaml`](./render.yaml) file for single-service deployment with an attached persistent disk for the SQLite database.

---

## 📄 License

MIT License. Designed for clothing retail businesses and fashion boutiques.

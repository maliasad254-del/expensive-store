# Expensive Store — Complete E-Commerce Platform (Cloudflare + Android)

**Brand:** Expensive Store — *Shop Smart, Pay Less.*  
**Country / Currency:** Pakistan (`PKR`)  
**Payment Method:** **Cash on Delivery (COD) ONLY**

---

## Project Architecture

1. **Android Native App (`/app`)** — Kotlin + Jetpack Compose + Material 3 + Room SQLite (runs directly in AI Studio Android emulator or on any Android smartphone).
2. **Cloudflare Full-Stack Web Platform (`/cloudflare-web`)**:
   - **Frontend:** React 18, TypeScript, Vite, Tailwind CSS (`src/`)
   - **Backend:** Cloudflare Workers TypeScript API (`worker/`)
   - **Database:** Cloudflare D1 SQLite (`migrations/`)
   - **Image Storage:** Cloudflare R2 (`BUCKET` binding)
   - **Hosting:** Cloudflare Workers with Static Assets & SPA routing (`wrangler.toml`)

---

## Step-by-Step Deployment Guide (Beginner & Android Friendly)

### Method A: 100% From Your Android Smartphone (GitHub + Cloudflare Actions)
You do **not** need a laptop to publish this website using GitHub Actions:

1. **Create a Cloudflare Account**
   - Open your phone browser and sign up at `https://dash.cloudflare.com`.
2. **Create the D1 Database & R2 Bucket in Cloudflare Dashboard**
   - Go to **Workers & Pages → D1 SQL Database → Create Database** → Name it `expensive_store_db`.
   - Copy the **Database ID** shown on the database overview page.
   - Go to **R2 Object Storage → Create Bucket** → Name it `expensive-store-images`.
3. **Create a Cloudflare API Token**
   - In Cloudflare Dashboard, tap your profile icon → **My Profile → API Tokens → Create Token**.
   - Use the **Edit Cloudflare Workers** template and include permissions for **D1:Edit** and **Workers R2 Storage:Edit**.
   - Copy your **API Token** and your **Account ID** (visible on the Workers & Pages sidebar).
4. **Push `cloudflare-web/` to GitHub & Configure Secrets**
   - Put your copied D1 Database ID inside `cloudflare-web/wrangler.toml` (replace `YOUR_D1_DATABASE_ID`).
   - In your GitHub Repository → **Settings → Secrets and variables → Actions → New repository secret**:
     - `CLOUDFLARE_API_TOKEN` = your Cloudflare API token
     - `CLOUDFLARE_ACCOUNT_ID` = your Cloudflare Account ID
   - Push to `main` (or open **Actions → Deploy Expensive Store to Cloudflare → Run workflow**).
   - GitHub Actions automatically builds the app, runs D1 SQLite migrations, and publishes your live website!

---

### Method B: Automated Script Deployment (Computer or Android Termux)

If you have Node.js 20+ installed (on PC/Mac/Linux or Android Termux):

```bash
cd cloudflare-web
chmod +x scripts/*.sh
npm install
npx wrangler login
./scripts/setup-cloudflare.sh
```

1. Copy the `database_id` printed by `wrangler d1 create expensive_store_db` into `wrangler.toml`.
2. Run the automated deployment script:

```bash
./scripts/deploy.sh
```

---

## First-Time Admin Setup (Important!)

There is **no hardcoded admin password**. Immediately after deploying:

1. Open `https://your-site.workers.dev/admin/login`.
2. You will automatically see the **First-Time Admin Setup** screen.
3. Choose your admin username and a strong password (minimum 8 characters).
4. This creates your admin account in D1 using salted PBKDF2-SHA256 (100,000 iterations) and issues an `HttpOnly`, `SameSite=Lax`, `Secure` session cookie.
5. In the **Admin Dashboard → Settings**, enter your real:
   - WhatsApp number (`03XXXXXXXXX`)
   - Support phone & email
   - Business address & registration details
   - Delivery fee & free-delivery threshold in PKR
   - Verified customer reviews

---

## Production Verification Checklist

- [ ] Homepage loads with Hero banner, Featured Categories, Best Sellers, Offers, New Arrivals
- [ ] Search, Category filtering, and Price sorting return accurate D1 results
- [ ] Product detail page displays multi-image gallery, SKU, stock count, and PKR pricing
- [ ] Cart persists across browser refresh and updates quantities safely
- [ ] Checkout accepts Pakistani mobile numbers (`03XXXXXXXXX` / `+923XXXXXXXXX`) and **Cash on Delivery ONLY**
- [ ] Order placement creates a unique `EXP-YYYYMMDD-XXXX` order in D1, saves item price snapshots, and decrements product stock
- [ ] Public **Track Order** requires BOTH Order ID and registered mobile number and hides private address/phone info
- [ ] Admin routes return `401` when unauthenticated and require `X-CSRF-Token` for mutations
- [ ] Admin can upload images to R2, manage products/categories/orders/statuses, and edit store settings

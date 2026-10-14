# Dappersfit Logistics — iPhone PWA

A high-performance Progressive Web Application (PWA) specifically optimized for **Apple iPhone devices** running iOS Mobile Safari. Features full functional parity with the Dappersfit Android mobile application, engineered with ultra-smooth native HTML/CSS/JS rendering, zero mistouch lag, and native iOS WebKit physics.

---

## ⚡ iPhone-Exclusive Optimizations

- **Zero Tap Delay**: Enforced `touch-action: manipulation;` and `touch-action: pan-y;` on all interactive targets, eliminating Mobile Safari's 300ms tap latency.
- **No Mistouch Grey Flash**: Removed `-webkit-tap-highlight-color: transparent;` and disabled `-webkit-touch-callout: none;` so long-pressing UI elements does not trigger the iOS magnifying glass or selection popups.
- **Hardware-Accelerated ProMotion Scrolling**: Native momentum scrolling with `-webkit-overflow-scrolling: touch;` and GPU layer promotion (`transform: translate3d(0, 0, 0)`).
- **Notch & Dynamic Island Edge-to-Edge**: Integrated `viewport-fit=cover` and CSS `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`.
- **Standalone Display Mode**: Configured `apple-mobile-web-app-capable: yes`, `apple-mobile-web-app-status-bar-style: black-translucent`, and custom Apple Touch Icons.
- **Offline Fast Launch**: Service Worker (`sw.js`) caches the core application shell for instant 0ms startup even on spotty cellular connections.
- **Smart iOS Installation Prompt**: Automatic visual tooltip on iPhone Safari showing users how to tap **Share 􀈂** and select **Add to Home Screen 􀎶**.

---

## 📱 Full Feature Parity with Android App

1. **Authentication & Session**:
   - Operator login with Role switcher (Admin / Staff).
   - 1-Tap Demo sign-in for testing.
   - Dynamic backend server URL selector (`https://dappersfit.onrender.com`).
2. **Tab 1 — Fulfillment Cockpit**:
   - Live sync indicator with pull-to-refresh.
   - 2x2 Balanced KPI Matrix (Total Orders, Pending Dispatch, Booked Priority, Delivered).
   - Priority Air Cutoff banner with countdown timer.
   - Live Staff Activity Feed.
3. **Tab 2 — Live Orders Management**:
   - Instant Search (Order ID, Customer, Phone, AWB, Pincode).
   - Horizontal Filter Carousel (All, Pending, Booked, Shipped, Delivered, Urgent).
   - Date Filter pills (Today, Yesterday, All).
   - Export to CSV / Excel.
   - Instant Priority Courier Booking (Shiprocket API).
   - Slide-up Order Detail Sheet with WhatsApp chat, AWB tracking, Shipping Label & Tax Invoice generator.
4. **Tab 3 — Replacements & Tickets**:
   - Top Stat strip with severity flag counts.
   - **AI WhatsApp Return Intake**: Paste raw customer WhatsApp message to auto-extract Order ID, Phone, SKU, and reasons using AI logic.
   - Ticket severity badges (Red Flag Urgent, Orange Review, Green Routine).
   - Log new ticket modal.
5. **Tab 4 — Operations & Admin Hub**:
   - Courier Booking 2-step rate comparison wizard (Blue Dart, Delhivery, DTDC).
   - Products & SKU Stock Registry.
   - Customers Lifetime Value (LTV) Database.
   - Shipping Hubs & Warehouse Routing.
   - Reports & SLA Performance Analytics.
   - **Employee Wallet**: Balance, incentives, salary, and Amazon-style tokenized search.
   - **Admin Tools**: Staff directory, payroll disbursement, weekly incentives, and Shiprocket audit logs.

---

## 🚀 Deployment to Vercel

This PWA is configured out-of-the-box for instant zero-configuration deployment on **Vercel**:

### Option 1: Deploy with Vercel CLI (Fastest)
From the `dappersfit-pwa` directory:
```bash
npx vercel
```
Follow the interactive prompts:
- Set up and deploy: **Yes**
- Which scope: Select your team/account
- Link to existing project: **No**
- Project name: `dappersfit-pwa`
- Directory: `./`
- Modify build settings: **No**

### Option 2: Push to GitHub & Connect to Vercel
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "feat: complete iOS-optimized Dappersfit PWA"
   ```
2. Push to your GitHub repository (e.g., `bunny-9015/dappersfit-pwa` or as part of the monorepo):
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com) -> **Add New Project** -> Import your GitHub repository.
4. If deploying from a subfolder, set **Root Directory** to `dappersfit-pwa`.
5. Click **Deploy**!

---

## 🛠️ Testing Locally

You can run the PWA locally with any static HTTP server:

```bash
# Using npm
npm start

# Or using npx serve directly
npx serve . -l 5173
```
Open `http://localhost:5173` in your browser (or use Safari Responsive Design Mode selecting iPhone 15/16 Pro).

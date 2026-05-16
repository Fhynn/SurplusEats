<div align="center">

# SurplusEats

Prototype aplikasi web untuk food rescue, pembelian makanan surplus, dashboard owner restoran, dan dashboard admin operasional.

Web application prototype for food rescue, surplus food ordering, restaurant owner operations, and admin management.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Status: Work in Progress / Masih Dalam Tahap Pengerjaan**

[Live Demo](#live-demo--links) · [Bahasa Indonesia](#bahasa-indonesia) · [English](#english) · [Screenshots](#screenshots) · [Credit](#credit--ownership)

</div>

---

## Live Demo / Links

Public deployment / Deployment publik:

**https://surplus-eats.vercel.app/**

> This website is still in development. Backend integration has started, but several screens still use mock/local state while the API wiring is completed.  
> Website ini masih dalam tahap pengerjaan. Integrasi backend sudah dimulai, tetapi beberapa layar masih memakai mock/state lokal sambil proses penyambungan API diselesaikan.

| Page / Halaman | Public URL |
| --- | --- |
| Main / Login | https://surplus-eats.vercel.app/ |
| Forgot Password | https://surplus-eats.vercel.app/forgot-password |
| Customer Register | https://surplus-eats.vercel.app/register |
| Customer Home | https://surplus-eats.vercel.app/home |
| Customer Notifications | https://surplus-eats.vercel.app/notifications |
| Browse Food | https://surplus-eats.vercel.app/browse |
| Browse Food Alias | https://surplus-eats.vercel.app/browser |
| Cart | https://surplus-eats.vercel.app/cart |
| Checkout | https://surplus-eats.vercel.app/checkout |
| Payment Success | https://surplus-eats.vercel.app/payment-success |
| Payment Failed | https://surplus-eats.vercel.app/payment-failed |
| Customer Orders | https://surplus-eats.vercel.app/orders |
| Live Order Tracking | https://surplus-eats.vercel.app/orders/SFM-99A2X |
| Refund Request | https://surplus-eats.vercel.app/orders/SFM-77C0Z/refund |
| Order Tracking | https://surplus-eats.vercel.app/tracking |
| Order History | https://surplus-eats.vercel.app/history |
| Customer Profile | https://surplus-eats.vercel.app/profile |
| Account Settings | https://surplus-eats.vercel.app/profile/settings |
| Edit Profile | https://surplus-eats.vercel.app/profile/edit |
| Saved Addresses | https://surplus-eats.vercel.app/profile/addresses |
| Customer Vouchers | https://surplus-eats.vercel.app/profile/vouchers |
| Help Center | https://surplus-eats.vercel.app/help |
| Customer Support | https://surplus-eats.vercel.app/support |
| Daftar Usaha / Partner Registration | https://surplus-eats.vercel.app/register-mitra |
| Owner Dashboard | https://surplus-eats.vercel.app/owner/dashboard |
| Owner Menu Management | https://surplus-eats.vercel.app/owner/menu |
| Owner Order Detail | https://surplus-eats.vercel.app/owner/orders/SFM-99A2X |
| Owner Wallet / Saldo | https://surplus-eats.vercel.app/owner/wallet |
| Owner Analytics | https://surplus-eats.vercel.app/owner/analytics |
| Owner Reviews | https://surplus-eats.vercel.app/owner/reviews |
| Owner Notifications | https://surplus-eats.vercel.app/owner/notifications |
| Owner Settings | https://surplus-eats.vercel.app/owner/settings |
| Owner Verification | https://surplus-eats.vercel.app/owner/verify |
| Owner Banned Page | https://surplus-eats.vercel.app/owner/banned |
| Admin Dashboard | https://surplus-eats.vercel.app/admin/dashboard |
| Admin Users Tab | https://surplus-eats.vercel.app/admin/dashboard?tab=users |
| Admin Verification Tab | https://surplus-eats.vercel.app/admin/dashboard?tab=verification |
| Admin Transactions Tab | https://surplus-eats.vercel.app/admin/dashboard?tab=transactions |
| Admin Analytics Tab | https://surplus-eats.vercel.app/admin/dashboard?tab=analytics |
| Admin Notifications | https://surplus-eats.vercel.app/admin/notifications |
| Admin User Detail | https://surplus-eats.vercel.app/admin/users/USR-10481 |
| Admin Verification Detail | https://surplus-eats.vercel.app/admin/verifications/UMKM-24081 |
| Admin Transaction Detail | https://surplus-eats.vercel.app/admin/transactions/TRX-78291 |
| Admin Refund Detail | https://surplus-eats.vercel.app/admin/refunds/SE-8821 |
| Admin Settings | https://surplus-eats.vercel.app/admin/settings |

---

## Screenshots

Screenshot files are stored in [`public/screenshots`](public/screenshots).

### Customer App

| Login | Home | Cart |
| --- | --- | --- |
| <img src="public/screenshots/screencapture-localhost-3000-2026-04-30-02_17_24.png" width="220" alt="Customer Login" /> | <img src="public/screenshots/screencapture-localhost-3000-home-2026-04-30-02_18_05.png" width="220" alt="Customer Home" /> | <img src="public/screenshots/screencapture-localhost-3000-cart-2026-04-30-02_19_01.png" width="220" alt="Customer Cart" /> |

| Checkout | Tracking | Profile |
| --- | --- | --- |
| <img src="public/screenshots/screencapture-localhost-3000-checkout-2026-04-30-02_19_16.png" width="220" alt="Customer Checkout" /> | <img src="public/screenshots/screencapture-localhost-3000-tracking-2026-04-30-02_19_35.png" width="220" alt="Customer Tracking" /> | <img src="public/screenshots/screencapture-localhost-3000-profile-2026-04-30-02_20_01.png" width="220" alt="Customer Profile" /> |

| Order History | Review Modal |
| --- | --- |
| <img src="public/screenshots/screencapture-localhost-3000-history-2026-04-30-02_20_20.png" width="220" alt="Customer History" /> | <img src="public/screenshots/screencapture-localhost-3000-history-2026-04-30-02_20_43.png" width="220" alt="Customer Review Modal" /> |

### Owner Dashboard

| Dashboard | Orders / Menu Management |
| --- | --- |
| <img src="public/screenshots/screencapture-localhost-3000-owner-dashboard-2026-04-30-02_22_05.png" width="420" alt="Owner Dashboard" /> | <img src="public/screenshots/screencapture-localhost-3000-owner-dashboard-2026-04-30-02_23_20.png" width="420" alt="Owner Management" /> |

| Notifications | Settings |
| --- | --- |
| <img src="public/screenshots/screencapture-localhost-3000-owner-notifications-2026-04-30-02_23_49.png" width="420" alt="Owner Notifications" /> | <img src="public/screenshots/screencapture-localhost-3000-owner-settings-2026-04-30-02_24_10.png" width="420" alt="Owner Settings" /> |

### Admin Dashboard

| Admin Overview | User Management |
| --- | --- |
| <img src="public/screenshots/screencapture-localhost-3000-admin-dashboard-2026-04-30-02_24_42.png" width="420" alt="Admin Dashboard Overview" /> | <img src="public/screenshots/screencapture-localhost-3000-admin-dashboard-2026-04-30-02_24_55.png" width="420" alt="Admin User Management" /> |

| Verification | Transaction / Refund |
| --- | --- |
| <img src="public/screenshots/screencapture-localhost-3000-admin-dashboard-2026-04-30-02_25_15.png" width="420" alt="Admin Verification" /> | <img src="public/screenshots/screencapture-localhost-3000-admin-dashboard-2026-04-30-02_25_37.png" width="420" alt="Admin Transaction Refund" /> |

| Analytics | Additional Admin Screen |
| --- | --- |
| <img src="public/screenshots/screencapture-localhost-3000-admin-dashboard-2026-04-30-02_25_54.png" width="420" alt="Admin Analytics" /> | <img src="public/screenshots/screencapture-localhost-3000-admin-dashboard-2026-04-30-02_26_07.png" width="420" alt="Admin Additional Screen" /> |

---

## Bahasa Indonesia

### Tentang Project

SurplusEats adalah prototype aplikasi web untuk membantu pelanggan membeli makanan surplus dari restoran atau UMKM dengan harga lebih hemat. Di sisi lain, owner restoran dapat mengelola menu surplus, pesanan, stok, dan pengaturan toko. Admin dapat mengelola pengguna, verifikasi restoran, transaksi, refund, dan laporan analitik.

Project ini masih berada pada tahap pengerjaan. Fondasi backend sudah dimulai dengan Neon PostgreSQL, Prisma, Vercel Blob, seed data, API awal, session login, password hash, dan route guard berbasis role. Sebagian layar masih memakai mock data dan state lokal sampai proses penyambungan API selesai. Integrasi penuh Neon Auth SDK dan payment gateway masih dalam tahap berikutnya.

### Status Development

Project ini **masih dalam tahap pengerjaan**.

Yang belum final:

- Sebagian layar belum tersambung ke API database.
- Session login/register sudah aktif, tetapi integrasi penuh Neon Auth SDK belum final.
- Belum ada payment gateway asli.
- Role guard dasar sudah aktif untuk customer, owner, dan admin; permission API detail masih perlu diperdalam.
- Sebagian data masih menggunakan mock data.
- Sebagian state masih berada di komponen React.

### Fitur Utama

#### Customer App

- Login customer dengan validasi backend, session cookie, akun demo nyata, remember me, lupa password, link daftar mitra, dan register interaktif dengan preferensi makanan, validasi password, serta persetujuan layanan.
- Reset password customer dengan step indicator, OTP, countdown kirim ulang, validasi password, konfirmasi password, dan success state.
- Home makanan surplus dengan search ke browser, impact card, quick actions, kategori, flash rescue list, diskon, stok, dan quick add to cart.
- Browse / pencarian makanan dengan query aktif, kategori, sorting, filter modal, statistik hasil, empty state, dan quick add to cart.
- Detail makanan dengan hero visual, favorit, quantity selector, harga hemat, pickup info, dampak food rescue, ketentuan pickup, ulasan ringkas, add to cart, dan checkout cepat.
- Cart / keranjang dengan impact food rescue, kontrol qty, hapus item, voucher, catatan pickup, ringkasan harga, dan konfirmasi kosongkan keranjang.
- Checkout dengan lokasi pickup, waktu pickup, item pesanan, catatan restoran, voucher, metode pembayaran, ringkasan harga, persetujuan pickup, dan simulasi payment failed.
- Payment success dengan receipt, QR pickup, timeline status, download/share simulasi, tracking, dan payment failed flow dengan retry metode pembayaran serta bantuan support.
- Riwayat pesanan customer dengan tab aktif/selesai, search, ringkasan pickup hari ini, card status, ulasan, refund, dan pesan lagi.
- Tracking pesanan dengan map, status ready/preparing, QR pickup aktif, progress bar, detail pickup, lokasi, chat restoran, receipt, dan flow pembatalan.
- Pengajuan refund dengan ringkasan nominal, progress kelengkapan, alasan, preview bukti, checklist bukti, detail masalah, metode pengembalian, timeline review, dan success summary.
- Riwayat pesanan legacy dengan pencarian, ulasan, refund, dan pesan lagi.
- Modal ulasan restoran dengan star rating.
- Profile customer sebagai hub akun dengan statistik food rescue, keamanan akun, voucher, riwayat, alamat, bantuan, support, dan logout confirmation.
- Pengaturan akun customer dengan preferensi dan keamanan.
- Edit profil customer dengan preview foto dan ubah password.
- Kelola alamat tersimpan customer.
- Klaim, detail, dan status voucher customer.
- Pusat bantuan dengan pencarian FAQ dan detail jawaban.
- Live chat dan email support customer.

#### Owner Dashboard

- Dashboard owner desktop dengan KPI, tabel pesanan terbaru, aksi status order, dan shortcut tambah makanan.
- Kanban manajemen pesanan dengan ringkasan status, search order/customer/menu dari top bar dan query URL, aksi terima/tolak, tandai siap, dan konfirmasi pickup.
- Kelola menu surplus dengan search, filter kategori/stok, ringkasan aktif/sold out/diskon, modal tambah/edit/hapus makanan, preview gambar, dan deep link tambah makanan dari dashboard.
- Tambah makanan.
- Edit makanan dengan data pre-filled.
- Hapus makanan dengan modal konfirmasi.
- Pendaftaran mitra/toko dengan progress kelengkapan, kategori usaha, data operasional, upload dokumen, dan status verifikasi.
- Menunggu verifikasi owner dengan progress timeline, checklist dokumen, estimasi review, dan action support.
- Akun owner dibekukan dengan alasan, dampak akses, timeline review, dan jalur banding/support.
- Notifikasi owner dengan filter, status dibaca, dan action link.
- Pengaturan toko interaktif untuk profil, lokasi pickup, jam buka, dan preferensi operasional.
- Detail pesanan owner dengan chat customer, status order, dan flow tolak order.
- Analitik performa toko dengan periode 7/30/90 hari, KPI, grafik pendapatan, menu terlaris, jam pickup, dan dampak food rescue.

#### Admin Dashboard

- Sidebar/shell admin dark mode yang konsisten di semua route admin.
- Statistik operasional.
- Notifikasi prioritas admin dengan search, filter kategori/prioritas, bulk mark read, panel detail alert, dan action link.
- Kelola pengguna.
- Detail akun pengguna untuk audit admin.
- Ban / suspend user.
- Verifikasi restoran / UMKM.
- Detail verifikasi restoran / UMKM.
- Modal review dokumen.
- Kelola transaksi dan refund.
- Detail transaksi, payment, pickup, dan settlement.
- Laporan analitik.
- Pengaturan admin, keamanan, notifikasi operasional, dan role akses.

#### Backend Foundation

- Database Neon PostgreSQL dengan Prisma schema untuk user, owner/restoran, pendaftaran mitra, menu, cart, order, refund, asset upload, voucher, notification, wallet, review, dan audit log.
- Seed data demo untuk admin, owner, customer, password hash, restoran Bakehouse Bakery, menu surplus, order, voucher, wallet transaction, dan notification.
- API awal untuk auth login/register/logout/me, health check, restoran, menu item, pendaftaran/review mitra, checkout order, refund request, dan upload file ke Vercel Blob.
- Proxy route guard untuk mencegah akses langsung tanpa login ke route customer, owner, dan admin.
- Vercel Blob disiapkan untuk asset public seperti foto produk/restoran dan dapat diperluas untuk file private.

### Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- lucide-react
- Prisma 7
- Neon PostgreSQL
- Vercel Blob
- Zod

### Cara Menjalankan

Install dependency:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Buka di browser:

```text
http://localhost:3000
```

### Script

| Command | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run build` | Membuat production build |
| `npm run start` | Menjalankan production server |
| `npm run lint` | Menjalankan ESLint |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema Prisma ke database |
| `npm run db:seed` | Isi data demo awal |
| `npm run db:studio` | Membuka Prisma Studio |

### Environment Backend

Jangan commit secret asli. Simpan credential lokal di `.env.local` atau di Environment Variables Vercel.

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
NEON_AUTH_BASE_URL=""
NEON_AUTH_COOKIE_SECRET=""
```

### API Awal

| Route | Fungsi |
| --- | --- |
| `/api/health` | Cek koneksi database, Blob, Neon Auth env, dan count data utama |
| `/api/auth/login` | Login dengan email/password dan set session cookie |
| `/api/auth/register` | Register customer dan set session cookie |
| `/api/auth/register-owner` | Register mitra/owner pending review dan set session cookie |
| `/api/auth/logout` | Logout dan hapus session cookie |
| `/api/auth/me` | Ambil user dari session aktif |
| `/api/restaurants` | Ambil restoran approved beserta menu aktif |
| `/api/menu-items` | Ambil dan tambah menu owner |
| `/api/restaurant-applications` | Daftar mitra dan review approve/reject admin |
| `/api/orders` | Ambil order dan membuat checkout order |
| `/api/refunds` | Ambil dan membuat pengajuan refund |
| `/api/uploads` | Upload file ke Vercel Blob dan simpan asset ke database |

### Route Customer

| Route | Deskripsi |
| --- | --- |
| `/` | Login dengan validasi backend, session cookie, akun demo nyata, remember me, lupa password, dan link daftar mitra |
| `/forgot-password` | Reset password customer dengan OTP, countdown kirim ulang, validasi password, dan success state |
| `/register` | Register customer interaktif dengan preferensi makanan dan validasi password |
| `/home` | Home customer dengan search ke browser, impact card, quick actions, kategori, flash rescue, dan quick add |
| `/notifications` | Notifikasi customer dengan filter kategori/status, count belum dibaca, mark read, hapus item, action link, dan empty state |
| `/browse` | Browse makanan dengan UI seirama home, query aktif, kategori, sorting, filter modal, empty state, dan quick add |
| `/browser` | Alias browse makanan dengan UI seirama home |
| `/detail/[id]` | Detail makanan dengan favorit, quantity selector, pickup info, food rescue impact, ulasan, add to cart, dan checkout cepat |
| `/cart` | Keranjang dengan impact food rescue, kontrol qty, voucher, ringkasan harga, dan konfirmasi kosongkan |
| `/checkout` | Checkout dengan lokasi pickup, waktu pickup, item pesanan, voucher, payment method, summary, dan simulasi payment failed |
| `/payment-success` | Pembayaran berhasil dengan receipt, QR pickup, timeline status, download/share simulasi, dan tracking |
| `/orders` | Riwayat pesanan dengan tab aktif/selesai, search, ringkasan pickup, ulasan, refund, dan pesan lagi |
| `/orders/[id]` | Live tracking pesanan dengan status ready/preparing, QR pickup, progress bar, detail pickup, lokasi, chat, receipt, dan pembatalan |
| `/orders/[id]/refund` | Pengajuan refund dengan progress kelengkapan, preview bukti, checklist bukti, metode pengembalian, timeline review, dan success summary |
| `/payment-failed` | Pembayaran gagal dengan retry metode pembayaran dan bantuan support |
| `/tracking` | Tracking pesanan dengan map, QR pickup, timeline status, lokasi, dan chat restoran |
| `/history` | Riwayat pesanan legacy dengan pencarian, ulasan, refund, dan pesan lagi |
| `/profile` | Hub profile customer dengan statistik, keamanan akun, voucher, riwayat, alamat, bantuan, dan logout confirmation |
| `/profile/settings` | Pengaturan akun customer |
| `/profile/edit` | Ubah profil customer |
| `/profile/addresses` | Alamat tersimpan |
| `/profile/vouchers` | Voucher customer |
| `/help` | Pusat bantuan customer |
| `/support` | Live chat dan email support customer |

### Route Owner

| Route | Deskripsi |
| --- | --- |
| `/register-mitra` | Form pendaftaran mitra dengan progress, data operasional, dan upload dokumen |
| `/owner/dashboard` | Dashboard owner dengan KPI, tabel pesanan terbaru, top search, dan Kanban order dengan search/status summary |
| `/owner/menu` | Kelola menu dengan search, filter kategori/stok, ringkasan menu, modal tambah/edit/hapus makanan, dan deep link tambah menu |
| `/owner/orders/[id]` | Detail pesanan owner |
| `/owner/wallet` | Saldo dan pencairan dana |
| `/owner/analytics` | Analitik performa toko dengan periode 7/30/90 hari |
| `/owner/reviews` | Ulasan dan rating customer |
| `/owner/notifications` | Notifikasi owner |
| `/owner/settings` | Pengaturan toko |
| `/owner/verify` | Menunggu verifikasi owner dengan timeline dan checklist dokumen |
| `/owner/banned` | Akun owner dibekukan dengan alasan, dampak akses, timeline review, dan banding |

### Route Admin

| Route | Deskripsi |
| --- | --- |
| `/admin/dashboard` | Dashboard admin dengan shell/sidebar konsisten dan tab query |
| `/admin/dashboard?tab=users` | Tab kelola pengguna admin |
| `/admin/dashboard?tab=verification` | Tab verifikasi restoran / UMKM |
| `/admin/dashboard?tab=transactions` | Tab transaksi dan refund |
| `/admin/dashboard?tab=analytics` | Tab laporan analitik |
| `/admin/notifications` | Notifikasi prioritas admin dengan search, filter kategori/prioritas, bulk mark read, panel detail, dan action link |
| `/admin/users/[id]` | Detail akun pengguna admin |
| `/admin/verifications/[id]` | Detail verifikasi restoran / UMKM |
| `/admin/transactions/[id]` | Detail transaksi admin |
| `/admin/refunds/[id]` | Detail review refund admin |
| `/admin/settings` | Pengaturan admin |

### Struktur Folder

```text
app/
  admin/
  owner/
  browse/
  cart/
  checkout/
  detail/
  history/
  home/
  payment-failed/
  profile/
  register/
  register-mitra/
  tracking/

components/
  customer-*.tsx
  owner-menu-management.tsx
  main-shell.tsx
  mobile-device-frame.tsx

lib/
  customer-data.ts

public/
  screenshots/
```

### Rencana Lanjutan

1. Menghubungkan semua UI ke API database secara bertahap.
2. Memperdalam permission API per role.
3. Menyelesaikan integrasi penuh Neon Auth SDK.
4. Menambahkan payment gateway.
5. Menambahkan validasi form produksi yang lebih ketat.
6. Menambahkan testing otomatis.
7. Menentukan license resmi sebelum project dipublikasikan lebih luas.

---

## English

### About The Project

SurplusEats is a web application prototype for helping customers buy surplus food from restaurants or small businesses at a more affordable price. Restaurant owners can manage surplus menus, orders, stock, and store settings. Admins can manage users, restaurant verification, transactions, refunds, and analytics.

This project is still in development. The backend foundation has started with Neon PostgreSQL, Prisma, Vercel Blob, seed data, early API routes, login sessions, password hashing, and role-based route guards. Some screens still use mocked data and local state while API wiring is completed. Full Neon Auth SDK integration and the real payment gateway are still next-step work.

### Development Status

This project is **still in progress**.

Not final yet:

- Some screens are not connected to database APIs yet.
- Login/register sessions are active, but full Neon Auth SDK integration is not final yet.
- No real payment gateway yet.
- Basic role guards are active for customer, owner, and admin; detailed API permissions still need deeper hardening.
- Some data is still mocked.
- Some state is still local to React components.

### Main Features

#### Customer App

- Customer login with backend validation, session cookie, real demo accounts, remember me, forgot password, partner signup link, and interactive registration with food preferences, password validation, and terms agreement.
- Customer password reset with step indicator, OTP, resend countdown, password validation, password confirmation, and success state.
- Surplus food home screen with browser search, impact card, quick actions, categories, flash rescue list, discount, stock, and quick add to cart.
- Food browse / search page with active query, categories, sorting, filter modal, result stats, empty state, and quick add to cart.
- Food detail page with visual hero, favorite action, quantity selector, savings price, pickup info, food rescue impact, pickup terms, review highlights, add to cart, and quick checkout.
- Cart with food rescue impact, quantity controls, remove item, voucher, pickup notes, price summary, and clear-cart confirmation.
- Checkout with pickup location, pickup time, order items, restaurant note, voucher, payment methods, price summary, pickup agreement, and payment failed simulation.
- Payment success with receipt, pickup QR, status timeline, simulated download/share, tracking, and payment failed flow with payment retry plus support help.
- Customer order history with active/completed tabs, search, today's pickup summary, status cards, reviews, refunds, and reorder actions.
- Order tracking with map, ready/preparing states, active pickup QR, progress bar, pickup detail, location, restaurant chat, receipt, and cancellation flow.
- Refund request with amount summary, completion progress, reasons, evidence preview, evidence checklist, issue details, refund method, review timeline, and success summary.
- Legacy order history with search, review, refund, and reorder actions.
- Restaurant review modal with star rating.
- Customer profile hub with food rescue stats, account security, vouchers, orders, addresses, help, support, and logout confirmation.
- Customer account settings with preferences and security.
- Customer profile editing with photo preview and password change.
- Saved address management.
- Customer voucher claim, detail, and status flow.
- Help center with FAQ search and answer detail.
- Customer live chat and email support.

#### Owner Dashboard

- Desktop owner dashboard with KPIs, latest order table, order status actions, and add-food shortcut.
- Kanban order management with status summary, top-bar and URL-query order/customer/menu search, accept/reject, mark ready, and pickup confirmation actions.
- Surplus menu management with search, category/stock filters, active/sold-out/discount summary, add/edit/delete food modal, image preview, and add-food deep link from the dashboard.
- Add food modal.
- Edit food modal with pre-filled data.
- Delete food confirmation modal.
- Partner / store registration with completion progress, business category, operational data, document uploads, and verification status.
- Owner verification waiting page with progress timeline, document checklist, review estimate, and support action.
- Banned owner account page with restriction reason, locked access impact, review timeline, and appeal/support path.
- Owner notifications with filters, read state, and action links.
- Interactive store settings for profile, pickup location, hours, and operational preferences.
- Owner order detail with customer chat, order status, and reject order flow.
- Store performance analytics with 7/30/90 day periods, KPI cards, revenue chart, best sellers, pickup windows, and food rescue impact.

#### Admin Dashboard

- Consistent dark admin sidebar/shell across all admin routes.
- Operational statistics.
- Priority admin notifications with search, category/priority filters, bulk mark read, alert detail panel, and action links.
- User management.
- Admin user account detail.
- Ban / suspend user flow.
- Restaurant / UMKM verification.
- Restaurant / UMKM verification detail.
- Document review modal.
- Transaction and refund management.
- Transaction, payment, pickup, and settlement detail.
- Analytics report simulation.
- Admin settings, security, operational notifications, and access roles.

#### Backend Foundation

- Neon PostgreSQL database with Prisma schema for users, owners/restaurants, partner applications, menus, carts, orders, refunds, uploaded assets, vouchers, notifications, wallets, reviews, and audit logs.
- Demo seed data for admin, owner, customer, password hashes, Bakehouse Bakery, surplus menus, order, voucher, wallet transaction, and notifications.
- Early APIs for auth login/register/logout/me, health check, restaurants, menu items, partner applications/review, checkout orders, refund requests, and Vercel Blob uploads.
- Proxy route guard to block direct unauthenticated access to customer, owner, and admin routes.
- Vercel Blob is prepared for public assets such as product/restaurant photos and can be extended for private files.

### Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- lucide-react
- Prisma 7
- Neon PostgreSQL
- Vercel Blob
- Zod

### Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open in browser:

```text
http://localhost:3000
```

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push Prisma schema to the database |
| `npm run db:seed` | Seed initial demo data |
| `npm run db:studio` | Open Prisma Studio |

### Backend Environment

Do not commit real secrets. Store local credentials in `.env.local` or in Vercel Environment Variables.

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
NEON_AUTH_BASE_URL=""
NEON_AUTH_COOKIE_SECRET=""
```

### Early APIs

| Route | Purpose |
| --- | --- |
| `/api/health` | Check database connection, Blob, Neon Auth env, and main data counts |
| `/api/auth/login` | Login with email/password and set session cookie |
| `/api/auth/register` | Register customer and set session cookie |
| `/api/auth/register-owner` | Register partner/owner pending review and set session cookie |
| `/api/auth/logout` | Logout and clear session cookie |
| `/api/auth/me` | Fetch the active session user |
| `/api/restaurants` | Fetch approved restaurants with active menus |
| `/api/menu-items` | Fetch and create owner menu items |
| `/api/restaurant-applications` | Submit partner registration and admin approve/reject review |
| `/api/orders` | Fetch orders and create checkout orders |
| `/api/refunds` | Fetch and create refund requests |
| `/api/uploads` | Upload files to Vercel Blob and save asset records |

### Customer Routes

| Route | Description |
| --- | --- |
| `/` | Login with backend validation, session cookie, real demo accounts, remember me, forgot password, and partner signup link |
| `/forgot-password` | Customer password reset with OTP, resend countdown, password validation, and success state |
| `/register` | Interactive customer registration with food preferences and password validation |
| `/home` | Customer home with browser search, impact card, quick actions, categories, flash rescue, and quick add |
| `/notifications` | Customer notifications with category/status filters, unread counts, mark read, delete item, action links, and empty state |
| `/browse` | Food browse with home-style UI, active query, categories, sorting, filter modal, empty state, and quick add |
| `/browser` | Food browse alias with home-style UI |
| `/detail/[id]` | Food detail with favorite action, quantity selector, pickup info, food rescue impact, reviews, add to cart, and quick checkout |
| `/cart` | Cart with food rescue impact, quantity controls, voucher, price summary, and clear-cart confirmation |
| `/checkout` | Checkout with pickup location, pickup time, order items, voucher, payment method, summary, and payment failed simulation |
| `/payment-success` | Payment success with receipt, pickup QR, status timeline, simulated download/share, and tracking |
| `/orders` | Order history with active/completed tabs, search, pickup summary, reviews, refunds, and reorder actions |
| `/orders/[id]` | Live order tracking with ready/preparing states, pickup QR, progress bar, pickup detail, location, chat, receipt, and cancellation |
| `/orders/[id]/refund` | Refund request with completion progress, evidence preview, evidence checklist, refund method, review timeline, and success summary |
| `/payment-failed` | Payment failed with payment retry and support help |
| `/tracking` | Order tracking with map, pickup QR, status timeline, location, and restaurant chat |
| `/history` | Legacy order history with search, review, refund, and reorder actions |
| `/profile` | Customer profile hub with stats, account security, vouchers, orders, addresses, help, and logout confirmation |
| `/profile/settings` | Customer account settings |
| `/profile/edit` | Edit customer profile |
| `/profile/addresses` | Saved addresses |
| `/profile/vouchers` | Customer vouchers |
| `/help` | Customer help center |
| `/support` | Customer live chat and email support |

### Owner Routes

| Route | Description |
| --- | --- |
| `/register-mitra` | Partner / store registration form with progress, operational data, and document uploads |
| `/owner/dashboard` | Owner dashboard with KPIs, latest orders, top search, and Kanban orders with search/status summary |
| `/owner/menu` | Menu management with search, category/stock filters, menu summary, add/edit/delete food modal, and add-menu deep link |
| `/owner/orders/[id]` | Owner order detail |
| `/owner/wallet` | Wallet and withdrawal |
| `/owner/analytics` | Store performance analytics with 7/30/90 day periods |
| `/owner/reviews` | Customer reviews and ratings |
| `/owner/notifications` | Owner notifications |
| `/owner/settings` | Store settings |
| `/owner/verify` | Owner verification waiting page with timeline and document checklist |
| `/owner/banned` | Banned owner account with restriction reason, locked access impact, review timeline, and appeal |

### Admin Routes

| Route | Description |
| --- | --- |
| `/admin/dashboard` | Admin dashboard with consistent shell/sidebar and query tabs |
| `/admin/dashboard?tab=users` | Admin user management tab |
| `/admin/dashboard?tab=verification` | Restaurant / UMKM verification tab |
| `/admin/dashboard?tab=transactions` | Transaction and refund tab |
| `/admin/dashboard?tab=analytics` | Analytics report tab |
| `/admin/notifications` | Priority admin notifications with search, category/priority filters, bulk mark read, detail panel, and action links |
| `/admin/users/[id]` | Admin user account detail |
| `/admin/verifications/[id]` | Restaurant / UMKM verification detail |
| `/admin/transactions/[id]` | Admin transaction detail |
| `/admin/refunds/[id]` | Admin refund review detail |
| `/admin/settings` | Admin settings |

### Project Structure

```text
app/
  admin/
  owner/
  browse/
  cart/
  checkout/
  detail/
  history/
  home/
  payment-failed/
  profile/
  register/
  register-mitra/
  tracking/

components/
  customer-*.tsx
  owner-menu-management.tsx
  main-shell.tsx
  mobile-device-frame.tsx

lib/
  customer-data.ts

public/
  screenshots/
```

### Next Steps

1. Design the PostgreSQL database schema.
2. Build the backend API.
3. Add authentication.
4. Connect the UI to the database.
5. Add production-grade form validation.
6. Add payment gateway integration.
7. Add production file upload support.
8. Add tests.
9. Define an official license before broader publication.

---

## Credit & Ownership

Created and developed by:

**Fhynn**  
GitHub: [@Fhynn](https://github.com/Fhynn)

The project name **SurplusEats**, UI structure, product flow, and author identity in this README must not be removed, renamed, or claimed as someone else's work without permission from the project owner.

Copyright (c) 2026 **Fhynn**. All rights reserved.

This project has not been released under a public open-source license yet. If you want to use, modify, republish, or use this project as a base for another product, you must credit **Fhynn** and request permission first.

## Notice

Do not remove the author credit, rename the project, or claim this project as your own work. A formal `LICENSE` file should be added later before public distribution or collaboration.

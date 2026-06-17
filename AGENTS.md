Fitur Belum Sempurna

  1. Payment/checkout
     Tripay production dan webhook bertanda tangan sudah terintegrasi. Order sekarang PENDING sampai callback PAID, stok direstorasi ketika FAILED/EXPIRED, dan saldo mitra dibuat setelah pembayaran valid. Merchant masih perlu mengaktifkan channel pembayaran dan melakukan transaksi riil pertama.
  2. Pickup QR/scanner
     Pickup code, scanner, fallback input manual, handling kamera gagal, permission kamera, dan audit method SCANNER/MANUAL sudah ada. Masih perlu test device nyata.
  3. Lokasi customer/mitra
     Sudah ada auto location, map search, reverse geocode via API internal + cache, recent location lokal untuk customer/mitra, dan validasi titik toko yang menolak koordinat kosong/default/kasar/outside Indonesia.
  4. Search/filter marketplace
     Search/filter marketplace sudah punya range harga, rating, diskon terbesar, pickup time, toko favorit, kategori, sorting, autocomplete, dan no-result recovery di Browse. Masih bisa dikembangkan ke personalisasi ranking produksi.
  5. Cart interaction
     Home, browser, detail produk, ResQBot recommendation, store, dan favorite card sudah memakai feedback tambah keranjang yang konsisten: loading, check state, toast, dan fly-to-cart target. Masih bisa diperluas kalau ada card baru.
  6. Order realtime
     Order sudah memakai polling adaptif di customer orders, tracking, detail order, owner dashboard/detail, admin dashboard, dan payment status. Hook polling sudah pause saat tab hidden/offline, throttle trigger focus/visibility, dan ada sync manual di order customer. Realtime penuh via WebSocket/SSE masih belum ada.
  7. Notification system
     In-app notif ada. Animasi bell ada. Email/WhatsApp eksternal sudah didukung via Resend/Fonnte, ada env example, status diagnostik, dan test kirim di /admin/settings. Browser/PWA notification bridge sudah ada untuk menampilkan in-app notification baru saat web/PWA aktif setelah user memberi izin. Web Push server-side penuh dengan VAPID/subscription persistent belum ada; delivery audit masih basic lewat admin action log.
  8. Refund
     Refund flow ada dengan bukti, status, admin review, alasan baku, SLA review/payout, timeline customer/admin, template keputusan, link support refund terkait order, dan cron SLA reminder `/api/cron/refunds/sla-reminders` untuk admin/customer overdue. Belum ada refund gateway otomatis asli.
  9. Voucher
     Voucher sudah punya rules per toko, kategori, first order only, limit per user, campaign, quota, claim, validasi checkout, dan auto-expire cron `/api/cron/vouchers/expire`. Masih bisa dikembangkan ke rekomendasi/promo personal dan campaign analytics.
  10. Review
     Review sudah punya foto, filter rating, sorting terbaru/terlama/terbaik/terburuk/helpful, like/helpful, report review, dan balasan owner. Masih bisa dikembangkan ke moderasi otomatis dan video review.
  11. Favorite/follow toko
     Favorite menu/toko sudah ada, halaman favorit sudah memuat menu dan toko, menu favorit punya notif restock, dan follower toko mendapat notif saat menu baru aktif dengan dedupe. Push/email/WA promo masih opsional lewat konfigurasi notifikasi eksternal.
  12. Owner menu management
     Owner menu management sudah punya CRUD, bulk edit, duplicate menu, jadwal publish, auto sold-out/expired lifecycle, arsip menu, validasi harga/jam, cache invalidation, dan notif follower/favorit saat menu aktif. Validasi gambar upload sudah lewat signature file; scanning antivirus eksternal belum ada.
  13. Owner orders
     Owner order dashboard/detail sudah punya flow status guarded, bulk action untuk status operasional, QR/manual pickup verification, audit staff pickup, print struk, dan download receipt PDF. Bulk completed tetap per order karena wajib verifikasi pickup.
  14. Owner wallet/payout
     Wallet/payout sudah punya saldo pending/available, validasi rekening dasar, settlement otomatis wallet, fee platform/commission, payout request, admin single/bulk payout review, batch reference, transfer reference, dan metadata rekening. Belum ada payout otomatis langsung via bank/payment provider.
  15. Owner analytics
     Owner analytics sudah punya conversion rate, menu terlaris detail, jam pickup terlaris, refund rate, repeat customer, insight operasional, cache pendek, dan export laporan CSV/PDF. Masih bisa dikembangkan ke campaign analytics dan benchmark antar periode yang lebih dalam.
  16. Admin dashboard
     Admin dashboard sudah punya global search lintas user/restoran/menu/order/refund/ajuan/support/voucher/audit, audit detail modal, filter advanced, polling adaptif, dan export CSV/PDF sesuai filter. Masih bisa dikembangkan ke analytics admin lebih dalam dan permission granular.
  17. Admin approval mitra
     Admin approval mitra sudah punya checklist dokumen/final, preview file lebih nyaman untuk dokumen aktif dan riwayat revisi, template alasan revisi dokumen, template alasan reject pengajuan, dan history revisi dokumen. Masih bisa dikembangkan ke deteksi fraud/dokumen otomatis eksternal.
  18. Admin users
     Admin users sudah punya reset password admin-side, impersonation aman berdurasi pendek dengan audit, detail aktivitas user, device/session list, dan revoke session per device. Masih bisa dikembangkan ke permission granular admin dan self-service device management untuk user.
  19. Support ticket
     Support ticket sudah punya form detail, thread customer-admin, assignment admin, priority, attachment, SLA, polling, email/WhatsApp eksternal untuk ticket create/reply/update, dan SLA escalation otomatis lewat cron `/api/cron/support/sla-escalations`. Belum realtime penuh via WebSocket/SSE dan multi-admin assignment.
  20. ResQBot
     ResQBot sudah punya Gemini dengan fallback lokal, classifier quota/error/timeout, guardrail output final, schema JSON Gemini, context cart/order/checkout lebih kaya, dan checkoutReady dikunci ke state checkout asli. Masih bisa dikembangkan ke tool execution yang benar-benar membuat aksi terarah dan context personalisasi riwayat lebih dalam.
  21. Loading/error/empty state
     Loading/error/empty state sudah punya komponen reusable `StateCard`, `PageState`, `InlineNotice`, dan skeleton yang lebih aksesibel. Route penting customer/admin/owner/payment sudah mulai diseragamkan, termasuk detail order, refund, transaksi, verifikasi, dan payment status/success. Masih perlu audit manual seluruh route minor agar 100% konsisten.
  22. Responsive QA
     Responsive QA sudah dijalankan otomatis di Chrome headless pada 360x740, 390x844, 768x1024, dan 1440x900 untuk route publik serta route protected yang redirect ke login. Tidak ada horizontal overflow dan tidak ada touch target kecil pada pass terbaru. Prompt install PWA sudah aman untuk safe-area bawah dan footer login/legal sudah memakai target klik minimum. Masih perlu test manual di device nyata untuk route protected setelah login customer/owner/admin.
  23. Performance
     Cache layer server-side sudah ada dengan optional Upstash Redis REST dan memory fallback. Public menu listing sudah cache pendek + invalidasi saat stok/menu berubah, owner analytics cache per owner/periode, admin dashboard JSON sudah cache pendek per filter, admin dashboard query menu sudah pakai agregasi, dan notification API sudah membatasi payload + unreadCount akurat. Cache layer sekarang punya statistik hit/miss, memory/Redis hit, invalidasi, error counter, dan status bisa dipantau dari `/admin/settings` lewat endpoint `/api/admin/settings/cache-status`. Mutasi order/menu/payment/refund/voucher/verifikasi mitra sudah menginvalidasi tag admin dashboard. Masih bisa dikembangkan ke Redis production env final, monitoring eksternal hit ratio, dan tracing query lambat.
  24. Security hardening
     Auth dan role guard ada. Rate limit login/register/upload/checkout/ResQBot sudah ada dengan Redis optional + memory fallback. Rate limit granular juga sudah diperluas ke endpoint sensitif: support create/reply, refund create/review, voucher claim/admin voucher, review/report, owner menu/order/payout, approval mitra, admin user reset/impersonate/revoke session, payout admin, support admin, dan settings admin. Middleware API sudah menolak mutasi dari origin asing, upload sudah divalidasi dari signature file, dan rate limit block tercatat ke admin action log dengan metadata origin/referer/user-agent/IP/hash identitas. Masih perlu upload antivirus/scanning eksternal dan monitoring security production seperti Sentry/SIEM.
  25. Data integrity
     Schema sudah cukup rapi. Voucher checkout/claim sudah memakai advisory lock + update atomik, order transition owner/bulk/customer cancel sudah memakai optimistic guard status lama + payment PAID, callback Tripay dikunci per reference, wallet income update tidak lagi silent updateMany, dan refund paid mengecek order masih valid. Masih perlu constraint database tambahan/unique partial yang lebih kuat dan audit rekonsiliasi berkala.

  Fitur Belum Ada

  1. Aktivasi channel pembayaran Tripay production dan verifikasi transaksi riil pertama.
  2. Refund otomatis melalui payment gateway.
  3. Invoice/receipt download PDF sudah ada lewat route `/api/orders/[orderCode]/receipt`, tersedia untuk customer/owner/admin yang berhak setelah pembayaran PAID/REFUNDED, dan tombol download tampil di payment success/detail order.
  4. Email notification sudah tersedia via Resend kalau env production aktif; masih perlu domain sender production yang verified.
  5. WhatsApp notification sudah tersedia via Fonnte kalau env production aktif; masih perlu nomor/token produksi yang stabil.
  6. PWA install dasar sudah ada: manifest, service worker konservatif, offline fallback, install prompt, permission control notifikasi browser, dan bridge notifikasi lokal saat web/PWA aktif. Push notification penuh belum ada karena masih perlu Web Push subscription, VAPID keys, storage subscription, dan delivery worker.
  7. Realtime order tracking.
  8. Live chat customer-owner/admin.
  9. Delivery, tapi ini memang sudah diputuskan tidak dipakai.
  10. Maps route embedded di web, sekarang mostly buka Google Maps.
  11. Reverse geocode alamat dari koordinat sudah ada lewat `/api/locations/reverse` dengan cache dan fallback koordinat.
  12. Saved/recent location sudah ada secara lokal di browser untuk customer dan titik toko.
  13. Store/menu pickup status otomatis dari jam pickup sudah tampil di Home, Browser, Detail Produk, dan Store. Masih bisa dikembangkan nanti menjadi jam operasional toko penuh.
  14. Promo campaign per toko sudah ada secara dasar lewat voucher campaign dan scope toko; campaign analytics masih belum ada.
  15. Voucher per toko/kategori sudah ada; voucher khusus per menu belum ada.
  16. Referral code.
  17. Loyalty point/level customer.
  18. Rating foto sudah ada; rating video belum ada.
  19. Report review sudah ada; report menu/toko belum ada.
  20. Moderasi konten otomatis.
  21. Menu recommendation personal berdasarkan riwayat.
  22. “Beli lagi” yang benar-benar otomatis dari history.
  23. Wishlist/favorite notification saat stok tersedia sudah ada untuk in-app notification ketika menu favorit aktif/restock lewat update menu, bulk update, schedule publish, cancel order, dan Tripay failed/expired. Push/email/WA promo bisa diaktifkan nanti lewat konfigurasi notifikasi eksternal.
  24. Payout otomatis ke rekening.
  25. Platform fee/commission system sudah ada secara dasar. Checkout menyimpan service fee/pajak sebagai biaya customer dan platformFee sebagai komisi mitra. Wallet mitra hanya dikurangi komisi mitra saat callback Tripay PAID; service fee/pajak customer tidak tampil sebagai potongan mitra.
  26. Tax/service fee config admin sudah ada di /admin/settings. Admin bisa mengubah service fee flat/persen, pajak flat/persen, komisi flat/persen, minimum komisi, dan status aktif.
  27. Export CSV/PDF untuk owner analytics dan admin dashboard lintas entity sudah ada; export spesifik halaman admin lain masih bisa ditambah.
  28. Audit log UI yang lengkap.
  29. Admin role permission granular.
  30. Multi-admin assignment untuk support/refund.
  31. Device/session management admin-side sudah ada untuk melihat dan mencabut session per user; self-service device/session management untuk customer/owner belum ada.
  32. Forgot password email asli.
  33. Email verification asli.
  34. Two-factor authentication.
  35. Rate limiting sudah ada untuk login/register/upload/checkout/ResQBot dan diperluas ke endpoint sensitif customer/owner/admin. Masih perlu tuning limit produksi berdasarkan traffic asli.
  36. Redis/cache layer dasar sudah ada via optional Upstash Redis REST + memory fallback; rate limit juga bisa memakai Upstash Redis REST. Masih perlu env Redis production dan observability hit/miss.
  37. Background worker/queue.
  38. Cron tambahan untuk voucher expired, payout settlement, stale checkout.
      Cron refund SLA reminder dan support SLA escalation sudah ada; cron tambahan lain masih bisa ditambah untuk stale checkout/payment expiry khusus bila dibutuhkan.
  39. Monitoring/logging production seperti Sentry.
  40. E2E tests Playwright.
  41. Unit/integration tests API penting.
  42. Backup/restore database workflow.
  43. Review legal profesional berkala untuk Terms/Privacy yang sudah tersedia.
  44. Cookie consent/security policy.
  45. App install/PWA manifest sudah ada dengan `/manifest.webmanifest`, `/sw.js`, offline fallback, dan install prompt.

  Prioritas Paling Masuk Akal

  1. Payment gateway + webhook.
  2. Test scanner pickup di device nyata.
  3. Test scanner pickup di device nyata dan lanjut fitur berikutnya dari daftar.

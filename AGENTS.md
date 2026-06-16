Fitur Belum Sempurna

  1. Payment/checkout
     Tripay production dan webhook bertanda tangan sudah terintegrasi. Order sekarang PENDING sampai callback PAID, stok direstorasi ketika FAILED/EXPIRED, dan saldo mitra dibuat setelah pembayaran valid. Merchant masih perlu mengaktifkan channel pembayaran dan melakukan transaksi riil pertama.
  2. Pickup QR/scanner
     Pickup code dan scanner ada, tapi perlu fallback input manual, handling kamera gagal, permission kamera, dan test device nyata.
  3. Lokasi customer/mitra
     Sudah ada auto location dan map search, tapi belum ada reverse geocode nama alamat, recent location, dan validasi titik lokasi toko yang lebih pintar.
  4. Search/filter marketplace
     Search ada, tapi belum lengkap seperti filter range harga, rating, diskon terbesar, pickup time, toko favorit, kategori lebih detail.
  5. Cart interaction
     Home dan browser sudah dibuat animasi lebih bagus. Tapi detail produk, ResQBot recommendation, dan beberapa card lain masih belum sepenuhnya sama.
  6. Order realtime
     Order bisa update lewat API, tapi belum realtime penuh. Customer/owner/admin masih butuh refresh/polling di beberapa tempat.
  7. Notification system
     In-app notif ada. Animasi bell sudah ada. Tapi belum ada email/WhatsApp/push notification.
  8. Refund
     Refund flow ada dengan bukti, status, dan admin review. Tapi belum lengkap seperti chat refund, timeline detail, alasan baku, SLA, dan refund gateway asli.
  9. Voucher
     Voucher ada, tapi rules masih sederhana. Belum ada voucher per toko, kategori, first order only, limit per user, campaign, auto-expire job.
  10. Review
     Review dan balasan owner ada. Belum lengkap: foto review, filter review, like/helpful, report review, sorting terbaru/terburuk.
  11. Favorite/follow toko
     Favorite menu/toko ada. Belum sempurna: notif otomatis saat toko favorit upload menu baru dan halaman favorit bisa dibuat lebih kuat.
  12. Owner menu management
     CRUD menu sudah ada. Perlu bulk edit, duplicate menu, jadwal publish, stok otomatis habis, arsip menu, validasi gambar lebih rapi.
  13. Owner orders
     Owner order dashboard/detail ada. Perlu flow status lebih solid, bulk action, print/receipt, scanner fallback, dan status staff pickup.
  14. Owner wallet/payout
     Wallet dan payout ada. Belum production: rekening validasi, settlement otomatis, fee platform, payout batch, bukti transfer lebih detail.
  15. Owner analytics
     Analytics ada. Belum lengkap: conversion rate, menu terlaris detail, jam pickup terlaris, refund rate, repeat customer, export laporan.
  16. Admin dashboard
     Admin lengkap secara dasar. Belum sempurna: global search benar-benar lintas semua entity, audit detail, export, filter advanced.
  17. Admin approval mitra
     Approve/reject ada. Perlu checklist dokumen, preview file lebih nyaman, alasan reject template, dan history revisi dokumen.
  18. Admin users
     User management ada. Perlu reset password admin-side, impersonation aman, detail aktivitas user, device/session list.
  19. Support ticket
     Support ada. Belum realtime/chat penuh, assignment admin, priority, attachment tambahan, dan SLA.
  20. ResQBot
     AI route ada pakai Gemini. Belum sempurna: quota handling, guardrail jawaban, tool checkout lebih stabil, context order/cart lebih kaya.
  21. Loading/error/empty state
     Banyak sudah ada, tapi belum konsisten 100% di semua route.
  22. Responsive QA
     Sebagian besar sudah responsive, tapi belum semua route dicek manual di HP/tablet/desktop nyata.
  23. Performance
     Belum ada Redis/cache. Untuk traffic kecil aman, tapi listing menu, dashboard admin, notif count, dan analytics akan lebih cepat kalau cache.
  24. Security hardening
     Auth dan role guard ada. Perlu rate limit login/register/API, CSRF strategy, upload scanning, audit suspicious activity.
  25. Data integrity
     Schema sudah cukup rapi, tapi masih perlu constraint tambahan untuk voucher quota, order transitions, wallet settlement, dan status flow.

  Fitur Belum Ada

  1. Aktivasi channel pembayaran Tripay production dan verifikasi transaksi riil pertama.
  2. Refund otomatis melalui payment gateway.
  3. Invoice/receipt download PDF.
  4. Email notification.
  5. WhatsApp notification.
  6. Push notification/PWA.
  7. Realtime order tracking.
  8. Live chat customer-owner/admin.
  9. Delivery, tapi ini memang sudah diputuskan tidak dipakai.
  10. Maps route embedded di web, sekarang mostly buka Google Maps.
  11. Reverse geocode alamat dari koordinat.
  12. Saved/recent location.
  13. Store/menu pickup status otomatis dari jam pickup sudah tampil di Home, Browser, Detail Produk, dan Store. Masih bisa dikembangkan nanti menjadi jam operasional toko penuh.
  14. Promo campaign per toko.
  15. Voucher per toko/kategori/menu.
  16. Referral code.
  17. Loyalty point/level customer.
  18. Rating foto/video.
  19. Report review/menu/toko.
  20. Moderasi konten otomatis.
  21. Menu recommendation personal berdasarkan riwayat.
  22. “Beli lagi” yang benar-benar otomatis dari history.
  23. Wishlist/favorite notification saat stok tersedia sudah ada untuk in-app notification ketika menu favorit aktif/restock lewat update menu, bulk update, schedule publish, cancel order, dan Tripay failed/expired. Push/email/WA promo bisa diaktifkan nanti lewat konfigurasi notifikasi eksternal.
  24. Payout otomatis ke rekening.
  25. Platform fee/commission system sudah ada secara dasar. Checkout menyimpan service fee/pajak sebagai biaya customer dan platformFee sebagai komisi mitra. Wallet mitra hanya dikurangi komisi mitra saat callback Tripay PAID; service fee/pajak customer tidak tampil sebagai potongan mitra.
  26. Tax/service fee config admin sudah ada di /admin/settings. Admin bisa mengubah service fee flat/persen, pajak flat/persen, komisi flat/persen, minimum komisi, dan status aktif.
  27. Export CSV/PDF untuk admin dan owner.
  28. Audit log UI yang lengkap.
  29. Admin role permission granular.
  30. Multi-admin assignment untuk support/refund.
  31. Device/session management.
  32. Forgot password email asli.
  33. Email verification asli.
  34. Two-factor authentication.
  35. Rate limiting.
  36. Redis/cache layer.
  37. Background worker/queue.
  38. Cron tambahan untuk voucher expired, payout settlement, stale checkout.
  39. Monitoring/logging production seperti Sentry.
  40. E2E tests Playwright.
  41. Unit/integration tests API penting.
  42. Backup/restore database workflow.
  43. Review legal profesional berkala untuk Terms/Privacy yang sudah tersedia.
  44. Cookie consent/security policy.
  45. App install/PWA manifest.

  Prioritas Paling Masuk Akal

  1. Payment gateway + webhook.
  2. Scanner pickup fallback manual.
  3. Search/filter marketplace lebih lengkap.
  4. Notification email/WhatsApp untuk mitra/order/refund.
  5. Realtime/polling rapi untuk order.
  6. Refund/support flow lebih matang.
  7. Cache/performance setelah flow utama stabil.

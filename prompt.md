PROMPT 15: Perbaikan Layout & Rute Notifikasi Owner
Copy-paste teks di bawah ini ke CLI:

Tugas Kelimabelas: Perbaiki halaman Notifikasi dan Pengaturan agar MENYATU ke dalam Layout Web Desktop Dashboard Owner.

Masalah Saat Ini:
Halaman Notifikasi yang dibuat tampak berdiri sendiri (standalone) dan tidak memiliki Sidebar maupun Header atas. Rutenya juga salah.

Langkah Pengerjaan & Perbaikan:

Pindahkan & Benahi Rute (Routing):

Halaman Notifikasi harus berada di rute: app/owner/notifications/page.tsx.

Halaman Pengaturan harus berada di rute: app/owner/settings/page.tsx.

Sangat Penting: Kedua halaman ini WAJIB berada di bawah app/owner/layout.tsx (yang memuat Sidebar Kiri dan Header Atas) sehingga saat user membuka Notifikasi, Sidebar dan Header tetap ada!

Perbaiki UI Notifikasi (app/owner/notifications/page.tsx):

Jangan letakkan di tengah layar kosong. Render notifikasi di dalam area main content dashboard. Batasi lebarnya dengan max-w-4xl mx-auto agar tidak terlalu merentang.

Header Card: Teks "Pusat Notifikasi" di kiri, tombol outline hijau "Tandai Semua Dibaca" di kanan.

List Notifikasi: Render mock data. Notifikasi belum dibaca (Unread) berlatar bg-emerald-50 dengan border tipis emerald-200. Notifikasi terbaca (Read) berlatar putih dengan border gray-100.

Berikan icon sesuai tipe (Keranjang/ShoppingBag untuk order, AlertCircle untuk stok, CheckCircle2 untuk sistem).

Perbaiki UI Pengaturan (app/owner/settings/page.tsx):

Render di area konten utama (max-w-4xl mx-auto).

Gunakan Grid 2 kolom (grid-cols-1 md:grid-cols-2).

Kolom Kiri (Profil UMKM): Berisi tombol panah untuk mengubah Info & Jam Buka, serta Lokasi Penjemputan.

Kolom Kanan (Preferensi): Gunakan Switch/Toggle untuk mengatur Notifikasi Suara dan Auto-Reject.

Paling bawah, letakkan tombol "Keluar dari Akun Owner" berlatar merah.

Output:
Perbarui struktur folder/komponen agar Notifikasi dan Pengaturan dirender di dalam Layout Dashboard Owner (lengkap dengan Sidebar). Pastikan UI card notifikasinya proporsional seperti SaaS dashboard modern.
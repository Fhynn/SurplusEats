import type { Metadata } from "next";

import {
  LegalDocumentPage,
  type LegalSection,
} from "@/components/legal-document-page";
import { supportEmail } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | ResQFood",
  description:
    "Kebijakan Privasi ResQFood mengenai pengumpulan, penggunaan, penyimpanan, dan perlindungan data pengguna.",
};

const sections: LegalSection[] = [
  {
    id: "cakupan",
    title: "Cakupan Kebijakan",
    paragraphs: [
      "Kebijakan Privasi ini menjelaskan cara ResQFood mengumpulkan, menggunakan, menyimpan, membagikan, dan melindungi data ketika pengguna mengakses website, membuat akun, mendaftarkan usaha, melakukan transaksi, menggunakan ResQBot, atau menghubungi support.",
      "Dengan menggunakan ResQFood, pengguna memahami pemrosesan data yang dijelaskan dalam kebijakan ini. Untuk pemrosesan yang memerlukan persetujuan khusus, ResQFood akan meminta persetujuan melalui antarmuka layanan.",
    ],
  },
  {
    id: "data-dikumpulkan",
    title: "Data yang Kami Kumpulkan",
    bullets: [
      "Data akun dan identitas, seperti nama, email, nomor telepon, password yang telah di-hash, foto profil, serta status dan peran akun.",
      "Data lokasi, seperti koordinat lokasi aktif customer, alamat atau titik pickup mitra, label lokasi, dan informasi jarak untuk menampilkan menu terdekat.",
      "Data transaksi, seperti isi keranjang, detail pesanan, nilai pembayaran, voucher, status pembayaran, refund, kode pickup, dan riwayat komunikasi terkait order.",
      "Data mitra, termasuk informasi usaha, dokumen identitas atau izin yang diunggah, rekening payout, foto toko, menu, stok, dan jadwal pickup.",
      "Data perangkat dan aktivitas, seperti alamat IP, jenis browser, session cookie, waktu akses, log keamanan, dan interaksi dengan fitur.",
      "Isi yang dikirim pengguna, seperti ulasan, foto ulasan, tiket support, bukti refund, pesan order, serta pertanyaan kepada ResQBot.",
    ],
  },
  {
    id: "tujuan",
    title: "Tujuan Penggunaan Data",
    bullets: [
      "Membuat dan mengamankan akun serta memastikan akses sesuai peran customer, owner, atau admin.",
      "Menampilkan menu dan toko berdasarkan lokasi, memproses checkout, pembayaran, pickup, refund, voucher, serta dukungan pelanggan.",
      "Memverifikasi mitra dan dokumen usaha, mengelola menu, pesanan, wallet, payout, serta tindakan administrasi.",
      "Mengirim notifikasi operasional mengenai akun, pesanan, pembayaran, pickup, refund, promosi yang diizinkan, dan keamanan.",
      "Mencegah penipuan, penyalahgunaan akun, manipulasi nominal, transaksi tidak sah, dan aktivitas yang melanggar ketentuan.",
      "Menganalisis performa layanan, memperbaiki pengalaman pengguna, dan memenuhi kewajiban hukum yang berlaku.",
    ],
  },
  {
    id: "pembagian-data",
    title: "Pembagian Data dan Penyedia Layanan",
    paragraphs: [
      "ResQFood hanya membagikan data yang diperlukan untuk menjalankan layanan. Data order yang relevan dibagikan kepada mitra tempat customer memesan. Data juga dapat diproses oleh penyedia infrastruktur, database, penyimpanan file, pembayaran, notifikasi, peta, analitik, dan kecerdasan buatan.",
    ],
    bullets: [
      "Penyedia pembayaran, termasuk Tripay, untuk membuat transaksi, menerima status pembayaran, dan menangani callback pembayaran.",
      "Vercel untuk hosting aplikasi dan penyimpanan aset; Neon untuk database; serta penyedia teknis lain yang digunakan ResQFood.",
      "Penyedia notifikasi email atau WhatsApp apabila fitur tersebut diaktifkan dan pengguna memberikan data kontak yang sesuai.",
      "Pihak berwenang apabila diwajibkan oleh hukum, putusan, permintaan resmi, atau untuk melindungi hak dan keamanan pengguna.",
    ],
  },
  {
    id: "penyimpanan",
    title: "Penyimpanan dan Retensi",
    paragraphs: [
      "Data disimpan selama akun aktif dan selama diperlukan untuk memenuhi tujuan layanan, penyelesaian transaksi, audit, pencegahan penipuan, penanganan sengketa, serta kewajiban hukum. Masa simpan dapat berbeda berdasarkan jenis data.",
      "Setelah data tidak lagi diperlukan, ResQFood akan menghapus, menganonimkan, atau membatasi pemrosesannya sesuai kemampuan teknis dan ketentuan yang berlaku. Salinan cadangan dapat tetap tersimpan untuk periode terbatas sampai siklus backup selesai.",
    ],
  },
  {
    id: "keamanan",
    title: "Keamanan Data",
    paragraphs: [
      "ResQFood menerapkan kontrol akses berbasis peran, session cookie HTTP-only, hash password, validasi input, koneksi terenkripsi, pemeriksaan signature webhook, pembatasan akses file, dan pencatatan aktivitas administratif.",
      "Tidak ada sistem yang sepenuhnya bebas risiko. Pengguna wajib menjaga password, OTP, kode pickup, dan perangkatnya. ResQFood tidak akan meminta password, private key, atau OTP melalui pesan support.",
    ],
  },
  {
    id: "hak-pengguna",
    title: "Hak dan Pilihan Pengguna",
    bullets: [
      "Meminta akses atau salinan informasi pribadi yang terkait dengan akun.",
      "Memperbarui atau memperbaiki data yang tidak akurat.",
      "Meminta penghapusan akun atau data tertentu, sepanjang tidak bertentangan dengan kewajiban penyimpanan transaksi dan hukum.",
      "Menarik persetujuan untuk pemrosesan tertentu dan mengatur preferensi notifikasi.",
      "Mengajukan keberatan atau pertanyaan mengenai penggunaan data melalui kontak support.",
    ],
  },
  {
    id: "cookie-lokasi-ai",
    title: "Cookie, Lokasi, dan ResQBot",
    paragraphs: [
      "ResQFood menggunakan cookie session untuk mempertahankan login dan melindungi akun. Lokasi perangkat hanya diminta melalui izin browser dan digunakan untuk mengurutkan menu, menghitung jarak, serta membentuk rute pickup.",
      "Pertanyaan yang dikirim ke ResQBot dapat diproses oleh penyedia model kecerdasan buatan untuk menghasilkan jawaban. Jangan memasukkan password, OTP, data kartu, private key, atau data sensitif lain ke dalam percakapan ResQBot.",
    ],
  },
  {
    id: "perubahan-kontak",
    title: "Perubahan Kebijakan dan Kontak",
    paragraphs: [
      "Kebijakan ini dapat diperbarui apabila fitur, penyedia layanan, atau ketentuan hukum berubah. Tanggal pembaruan terbaru akan ditampilkan pada bagian atas halaman.",
      `Pertanyaan atau permintaan terkait privasi dapat dikirim ke ${supportEmail}. Sertakan email akun dan penjelasan permintaan tanpa mengirim password atau OTP.`,
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage
      activeHref="/kebijakan-privasi"
      eyebrow="Dokumen Privasi"
      title="Kebijakan Privasi ResQFood"
      description="Dokumen ini menjelaskan data yang diproses ResQFood dan pilihan yang tersedia bagi customer, mitra, serta pengguna lain."
      sections={sections}
    />
  );
}

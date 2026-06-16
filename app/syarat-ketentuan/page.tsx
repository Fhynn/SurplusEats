import type { Metadata } from "next";

import {
  LegalDocumentPage,
  type LegalSection,
} from "@/components/legal-document-page";
import { supportEmail } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan | ResQFood",
  description:
    "Syarat dan Ketentuan penggunaan marketplace makanan surplus ResQFood.",
};

const sections: LegalSection[] = [
  {
    id: "penerimaan",
    title: "Penerimaan Ketentuan",
    paragraphs: [
      "Syarat & Ketentuan ini mengatur penggunaan website dan layanan ResQFood. Dengan membuat akun, mendaftarkan usaha, memesan menu, menerima pesanan, atau menggunakan fitur lain, pengguna menyatakan telah membaca dan menyetujui ketentuan ini.",
      "Pengguna harus memiliki kecakapan hukum untuk melakukan transaksi. Apabila layanan digunakan oleh pihak yang belum cakap secara hukum, penggunaan harus berada di bawah persetujuan dan pengawasan orang tua atau wali.",
    ],
  },
  {
    id: "layanan",
    title: "Ruang Lingkup Layanan",
    paragraphs: [
      "ResQFood adalah marketplace yang mempertemukan customer dengan mitra makanan untuk penjualan produk surplus yang masih layak konsumsi. ResQFood menyediakan sarana pencarian, pemesanan, pembayaran, notifikasi, dukungan, dan verifikasi pickup.",
      "ResQFood tidak menyediakan layanan pengantaran. Customer bertanggung jawab datang ke lokasi mitra dan mengambil pesanan pada rentang waktu yang tercantum.",
    ],
  },
  {
    id: "akun",
    title: "Akun dan Keamanan",
    bullets: [
      "Informasi pendaftaran harus benar, terbaru, dan dapat diverifikasi.",
      "Satu akun tidak boleh digunakan untuk menyamar, menipu, memanipulasi transaksi, atau mengakses peran yang tidak berhak.",
      "Pengguna bertanggung jawab menjaga password, perangkat, kode pickup, dan session akun.",
      "ResQFood dapat membatasi, menangguhkan, atau menutup akun apabila ditemukan pelanggaran, aktivitas mencurigakan, atau kewajiban hukum.",
    ],
  },
  {
    id: "mitra",
    title: "Kewajiban Mitra",
    bullets: [
      "Mitra wajib memberikan identitas usaha, lokasi, rekening, dokumen, menu, harga, stok, foto, serta jam pickup yang benar.",
      "Produk harus aman, layak konsumsi, disimpan secara wajar, dan sesuai dengan informasi yang ditampilkan.",
      "Mitra wajib menjelaskan kandungan atau risiko alergi yang diketahui dan mematuhi ketentuan pangan serta usaha yang berlaku.",
      "Mitra wajib menyiapkan pesanan yang telah dibayar dan memverifikasi pickup menggunakan alur yang tersedia.",
      "Mitra dilarang menaikkan harga awal secara tidak wajar untuk menciptakan diskon palsu.",
    ],
  },
  {
    id: "pesanan-pembayaran",
    title: "Pesanan dan Pembayaran",
    paragraphs: [
      "Harga, diskon, biaya layanan, serta total pembayaran ditampilkan sebelum customer mengonfirmasi checkout. Pembayaran dapat diproses melalui penyedia pembayaran pihak ketiga, termasuk Tripay.",
      "Pesanan dianggap dibayar setelah ResQFood menerima konfirmasi pembayaran yang valid dari penyedia pembayaran. Status pada aplikasi menjadi rujukan utama. Customer tidak boleh mengubah nominal, merchant reference, atau data transaksi.",
    ],
  },
  {
    id: "pickup",
    title: "Pickup dan Pesanan Tidak Diambil",
    bullets: [
      "Customer harus memeriksa alamat, jarak, jam pickup, jumlah, dan catatan menu sebelum membayar.",
      "Customer wajib menunjukkan kode atau QR pickup hanya kepada staf mitra saat pesanan diterima.",
      "Keterlambatan dapat menyebabkan kualitas produk menurun atau pesanan ditandai tidak diambil setelah masa toleransi.",
      "Pesanan yang tidak diambil karena kesalahan customer tidak otomatis memenuhi syarat refund.",
    ],
  },
  {
    id: "pembatalan-refund",
    title: "Pembatalan dan Refund",
    paragraphs: [
      "Permintaan refund harus diajukan melalui alur yang tersedia dengan alasan dan bukti yang memadai. Contoh alasan yang dapat ditinjau meliputi toko tutup, produk tidak tersedia, pesanan tidak sesuai secara material, atau masalah pembayaran yang terverifikasi.",
      "Keputusan refund mempertimbangkan bukti customer, tanggapan mitra, status pickup, waktu pelaporan, serta data transaksi. Waktu pengembalian dana mengikuti metode pembayaran dan penyedia pembayaran terkait.",
    ],
  },
  {
    id: "larangan",
    title: "Aktivitas yang Dilarang",
    bullets: [
      "Melakukan penipuan, transaksi fiktif, manipulasi harga atau voucher, chargeback tidak sah, dan penyalahgunaan refund.",
      "Mengunggah dokumen palsu, konten melanggar hukum, malware, atau materi yang melanggar hak pihak lain.",
      "Mengambil data, mengganggu layanan, menguji keamanan tanpa izin, atau menghindari pembatasan akses.",
      "Menggunakan ResQBot untuk meminta tindakan ilegal, membagikan kredensial rahasia, atau menyesatkan pengguna lain.",
    ],
  },
  {
    id: "hak-kekayaan",
    title: "Hak Kekayaan Intelektual",
    paragraphs: [
      "Nama ResQFood, rancangan aplikasi, kode, teks, logo, dan materi milik ResQFood atau Fhynn dilindungi. Pengguna tidak memperoleh hak untuk menyalin, menjual, memodifikasi, atau menerbitkan ulang tanpa izin tertulis.",
      "Pengguna tetap bertanggung jawab atas konten yang diunggah dan memberikan izin terbatas kepada ResQFood untuk menampilkan serta memproses konten tersebut guna menjalankan layanan.",
    ],
  },
  {
    id: "tanggung-jawab",
    title: "Batas Tanggung Jawab",
    paragraphs: [
      "Mitra bertanggung jawab langsung atas produk, keamanan pangan, deskripsi, stok, dan pelaksanaan pickup. ResQFood akan membantu penyelesaian sengketa melalui data transaksi dan mekanisme support, tetapi bukan produsen makanan.",
      "Sepanjang diperbolehkan hukum, ResQFood tidak bertanggung jawab atas kerugian tidak langsung, gangguan yang berada di luar kendali wajar, atau kesalahan akibat informasi pengguna yang tidak benar.",
    ],
  },
  {
    id: "perubahan-hukum",
    title: "Perubahan, Hukum, dan Kontak",
    paragraphs: [
      "ResQFood dapat memperbarui ketentuan ini untuk menyesuaikan fitur, risiko, penyedia pembayaran, atau peraturan. Penggunaan layanan setelah ketentuan berlaku berarti pengguna menerima versi terbaru.",
      `Ketentuan ini tunduk pada hukum Republik Indonesia. Pertanyaan, keluhan, atau pemberitahuan resmi dapat dikirim ke ${supportEmail}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocumentPage
      activeHref="/syarat-ketentuan"
      eyebrow="Ketentuan Layanan"
      title="Syarat & Ketentuan ResQFood"
      description="Ketentuan ini mengatur hubungan ResQFood dengan customer, mitra, dan pengguna lain dalam pemesanan serta pickup makanan surplus."
      sections={sections}
    />
  );
}

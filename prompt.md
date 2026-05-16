PROMPT 18: Halaman Riwayat Pesanan & Live Tracking (Customer)
Silakan copy-paste instruksi di bawah ini ke CLI/AI Developer-mu:

Tugas Kedelapanbelas: Buat Halaman Riwayat Pesanan dan Halaman Lacak Pesanan (Live Tracking) untuk Customer.

Langkah Pengerjaan:

1. Halaman Riwayat Pesanan (app/orders/page.tsx):

Gunakan layout Mobile-First.

Header Tabs: Buat dua tab navigasi di atas ("Sedang Berjalan" dan "Selesai & Dibatalkan"). Berikan efek garis bawah hijau untuk tab yang aktif.

List Pesanan: Gunakan array.map untuk me-render daftar kartu pesanan.

Desain Kartu: Tampilkan Nama Restoran, Badge Status di kanan atas (Warna Hijau untuk "Siap Diambil", Biru untuk "Sedang Disiapkan", Abu-abu untuk "Selesai", Merah untuk "Batal"). Di bawahnya tampilkan list item, total harga, dan tanggal.

Interaktivitas: Jika status pesanan aktif (belum selesai/batal), saat kartu diklik, arahkan pengguna ke halaman Lacak Pesanan (Tracking).

2. Halaman Live Tracking (app/orders/[id]/page.tsx):

Area Peta (Map): Bagian sepertiga atas layar digunakan sebagai area peta/lokasi restoran. Gunakan gambar placeholder peta yang sedikit digelapkan (grayscale/opacity) dan letakkan icon Pin Point (Navigation/Store) di tengahnya.

Overlay Card (Tracking Details):

Buat div berlatar putih dengan rounded-[32px] yang menutupi bagian bawah layar dan bisa di-scroll.

QR Code Box: Di dalam card ini, buat area kotak garis putus-putus (border-dashed). Di dalamnya, tampilkan icon QR Code super besar (size={120}) dan teks "Tunjukkan QR ke Kasir".

Timeline Status: Buat list vertikal yang dihubungkan dengan garis memanjang ke bawah. List ini menampilkan urutan status pesanan: "Pesanan Dikonfirmasi" -> "Sedang Disiapkan" -> "Pesanan Siap Diambil". Berikan highlight hijau (bg-emerald-50) pada status terakhir yang tercapai.

Action Buttons: Di bagian paling bawah, letakkan Grid 2 kolom tombol: "Arahkan Lokasi" (Biru) dan "Chat Restoran" (Abu-abu).

Output:
Perbarui aplikasi Customer dengan kode React/Next.js murni Tailwind CSS. Pastikan halaman Lacak Pesanan ini memanjakan mata dengan komposisi layout bertumpuk (peta di belakang, kartu tracking melayang di depan).
import React, { useState } from 'react';
import { 
  ChevronLeft, MapPin, Clock, CheckCircle2, 
  QrCode, Store, Navigation, Package, ChevronRight,
  ShoppingBag, Search
} from 'lucide-react';

export default function CustomerTrackingFlow() {
  const [currentView, setCurrentView] = useState('history'); // 'history', 'tracking'
  const [activeTab, setActiveTab] = useState('aktif'); // 'aktif', 'selesai'

  const formatRp = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  };

  // Mock Data Pesanan Aktif
  const activeOrders = [
    { 
      id: "SFM-99A2X", 
      resto: "Bakehouse Bakery", 
      items: "Paket Roti Artisan Sourdough (x1)", 
      total: 15000, 
      status: "ready", // 'new', 'preparing', 'ready'
      statusText: "Siap Diambil",
      time: "Hari ini, 19:30"
    },
    { 
      id: "SFM-88B1Y", 
      resto: "Warteg Modern Bahari", 
      items: "Nasi Ayam Bakar (x2)", 
      total: 24000, 
      status: "preparing", 
      statusText: "Sedang Disiapkan",
      time: "Hari ini, 20:00"
    }
  ];

  // Mock Data Pesanan Selesai
  const pastOrders = [
    { 
      id: "SFM-77C0Z", 
      resto: "Sushi Yay!", 
      items: "Assorted Sushi Surplus (x1)", 
      total: 35000, 
      status: "completed", 
      statusText: "Selesai",
      time: "Kemarin, 21:00"
    },
    { 
      id: "SFM-66D9W", 
      resto: "Kopi Kenangan Mantan", 
      items: "Roti Coklat + Kopi Susu (x1)", 
      total: 20000, 
      status: "cancelled", 
      statusText: "Dibatalkan",
      time: "18 Okt 2023, 18:00"
    }
  ];

  // --- VIEW 1: RIWAYAT PESANAN ---
  const renderHistory = () => (
    <div className="flex-1 flex flex-col bg-[#f8fafc] animate-in fade-in duration-300">
      <div className="px-6 pt-10 pb-2 bg-white sticky top-0 z-20 shadow-sm">
        <h1 className="text-xl font-extrabold text-gray-900 mb-4">Riwayat Pesanan</h1>
        
        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('aktif')}
            className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'aktif' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            Sedang Berjalan
            {activeTab === 'aktif' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('selesai')}
            className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'selesai' ? 'text-gray-900' : 'text-gray-400'}`}
          >
            Selesai & Dibatalkan
            {activeTab === 'selesai' && <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 scrollbar-hide space-y-4">
        {(activeTab === 'aktif' ? activeOrders : pastOrders).map((order) => (
          <div 
            key={order.id} 
            onClick={() => order.status !== 'cancelled' ? setCurrentView('tracking') : null}
            className={`bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 relative group transition-all ${order.status !== 'cancelled' ? 'cursor-pointer hover:shadow-md hover:border-emerald-200' : 'opacity-75'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-gray-400" />
                <span className="font-extrabold text-gray-900 text-sm">{order.resto}</span>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                order.status === 'ready' ? 'bg-emerald-50 text-emerald-600' : 
                order.status === 'preparing' ? 'bg-blue-50 text-blue-600' : 
                order.status === 'completed' ? 'bg-gray-100 text-gray-600' : 
                'bg-red-50 text-red-600'
              }`}>
                {order.statusText}
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-4">{order.items}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">{order.time}</p>
                <p className="text-sm font-extrabold text-gray-900">{formatRp(order.total)}</p>
              </div>
              {order.status === 'ready' && (
                <button className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 group-hover:bg-emerald-500 transition-colors shadow-sm">
                  <QrCode size={14} /> Ambil Pesanan
                </button>
              )}
              {order.status === 'completed' && (
                <button className="bg-white border border-gray-200 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  Beli Lagi
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Simulasi Search Bar History */}
        {activeTab === 'selesai' && (
          <div className="relative mt-8">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Cari restoran atau menu..." className="w-full bg-white py-3.5 pl-11 pr-4 rounded-2xl text-sm font-medium text-gray-900 focus:outline-none border border-gray-200 shadow-sm" />
          </div>
        )}
      </div>
    </div>
  );

  // --- VIEW 2: LIVE TRACKING & QR CODE ---
  const renderTracking = () => (
    <div className="flex-1 flex flex-col bg-white animate-in slide-in-from-right duration-300 relative">
      {/* MAP BACKGROUND SIMULATION */}
      <div className="absolute top-0 w-full h-72 bg-emerald-50 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover opacity-60 mix-blend-overlay grayscale" alt="Map" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
        
        {/* Map Pins */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg mb-2">Bakehouse Bakery</div>
          <div className="w-8 h-8 bg-emerald-500 border-4 border-white rounded-full shadow-xl flex items-center justify-center animate-bounce">
            <Store size={14} className="text-white" />
          </div>
        </div>
      </div>

      <div className="px-6 pt-10 pb-4 relative z-20 flex items-center justify-between">
        <button onClick={() => setCurrentView('history')} className="p-2 -ml-2 bg-white/80 backdrop-blur-md rounded-full hover:bg-gray-100 transition-colors shadow-sm">
          <ChevronLeft size={24} className="text-gray-800" />
        </button>
        <div className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm text-xs font-bold text-gray-700">
          ID: SFM-99A2X
        </div>
      </div>

      {/* TRACKING CARD OVERLAY */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide relative z-20 mt-12">
        <div className="bg-white rounded-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border border-gray-100 p-6">
          
          {/* Status Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-emerald-600 mb-1">Siap Diambil!</h2>
            <p className="text-sm text-gray-500">Silakan datang ke toko sebelum 21:00 WIB.</p>
          </div>

          {/* QR CODE BOX */}
          <div className="bg-[#f8fafc] border-2 border-dashed border-gray-200 rounded-[24px] p-6 flex flex-col items-center justify-center mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500 blur-[50px] opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-blue-500 blur-[50px] opacity-20"></div>
            
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-3 relative z-10">
              <QrCode size={120} className="text-gray-900" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center relative z-10">Tunjukkan QR ke Kasir</p>
          </div>

          {/* Timeline Status */}
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-gray-200 before:to-gray-200 mb-8">
            
            {/* Step 3 (Current) */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <Package size={16} />
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm ml-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-emerald-900 text-sm">Pesanan Siap Diambil</h4>
                  <span className="text-[10px] font-bold text-emerald-600">19:30</span>
                </div>
                <p className="text-xs text-emerald-700">Makanan surplusmu sudah dikemas aman.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <CheckCircle2 size={16} />
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-gray-900 text-sm">Sedang Disiapkan</h4>
                  <span className="text-[10px] font-bold text-gray-400">19:15</span>
                </div>
                <p className="text-xs text-gray-500">Owner sedang menyiapkan pesananmu.</p>
              </div>
            </div>

            {/* Step 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <CheckCircle2 size={16} />
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-gray-900 text-sm">Pesanan Dikonfirmasi</h4>
                  <span className="text-[10px] font-bold text-gray-400">19:05</span>
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors">
              <Navigation size={20} />
              <span className="text-xs font-bold">Arahkan Lokasi</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 text-gray-600 rounded-2xl hover:bg-gray-100 transition-colors">
              <Store size={20} />
              <span className="text-xs font-bold">Chat Restoran</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-200 min-h-screen flex items-center justify-center p-0 md:p-6 font-sans selection:bg-emerald-200">
      <div className="w-full h-screen md:h-[850px] md:w-[400px] bg-white md:rounded-[40px] md:shadow-2xl overflow-hidden relative border-0 md:border-8 border-gray-900 flex flex-col">
        
        {currentView === 'history' && renderHistory()}
        {currentView === 'tracking' && renderTracking()}

      </div>
    </div>
  );
}
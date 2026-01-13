'use client';

import { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';

// Import Komponen Lonceng Notifikasi Baru
import { NotificationBell } from './NotificationBell';

export default function Header() {
  // State awal null untuk mencegah perbedaan saat render pertama
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setMounted(true); // Tandai bahwa komponen sudah di-mount di client
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Jika belum mounted (masih di server), tampilkan loading atau placeholder kosong
  // Ini mencegah error Hydration karena server & client sama-sama render kosong dulu
  if (!mounted) {
    return (
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Wifi className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">NOC Command Center</h1>
            <p className="text-xs text-slate-500 font-medium">Real-time Network Monitoring & Activities</p>
          </div>
        </div>
        {/* Bagian Kanan Kosong saat Loading (Server Side) */}
        <div className="w-40 h-10 animate-pulse bg-slate-100 rounded"></div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-sm sticky top-0 z-40">
      
      {/* BAGIAN KIRI: JUDUL SYSTEM */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Wifi className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Network Operating Center</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time Network Monitoring & Activities</p>
        </div>
      </div>

      {/* BAGIAN KANAN: NOTIFIKASI, STATUS & WAKTU */}
      <div className="flex items-center gap-4 md:gap-6 mt-3 md:mt-0">
        
        {/* 1. LONCENG NOTIFIKASI (BARU) */}
        {/* Komponen ini akan mengecek logic Missing Data secara otomatis */}
        <NotificationBell />
        
        {/* 2. Indikator System Normal */}
        <div className="hidden md:flex flex-col items-end">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wide">System Online</span>
          </div>
        </div>

        {/* 3. Jam Digital Realtime */}
        <div className="text-right border-l border-slate-200 pl-6">
          <p className="text-2xl font-mono font-bold text-slate-700 leading-none">
            {format(time, 'HH:mm:ss')}
          </p>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">
            {format(time, 'EEEE, dd MMMM yyyy', { locale: indonesia })}
          </p>
        </div>

      </div>
    </header>
  );
}
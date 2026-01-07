'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams, useRouter } from 'next/navigation'; 
import Link from 'next/link'; 
// PERBAIKAN: Menambahkan 'Server' ke dalam import
import { ArrowLeft, MapPin, Activity, Router, Pencil, Trash2, Server } from 'lucide-react';

export default function ClientDetailPage() {
  const params = useParams(); 
  const id = params.id;
  const router = useRouter();
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Setup Supabase
  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

  // Ambil Data
  useEffect(() => {
    async function fetchDetail() {
      if (!id) return;
      const { data, error } = await supabase
        .from('Data Client Corporate')
        .select('*')
        .eq('id', id)
        .single();

      if (error) console.error('Error:', error);
      else setClient(data);
      
      setLoading(false);
    }
    fetchDetail();
  }, [id, supabase]);

  // --- LOGIC HAPUS DENGAN KONFIRMASI ---
  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `BAHAYA! \n\nAnda yakin ingin MENGHAPUS data pelanggan ini?\nNama: ${client['Nama Pelanggan']}\n\nData yang dihapus tidak bisa dikembalikan!`
    );

    if (confirmDelete) {
      setIsDeleting(true);

      const { error } = await supabase
        .from('Data Client Corporate')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Gagal menghapus: ' + error.message);
        setIsDeleting(false);
      } else {
        alert('Data berhasil dihapus selamanya.');
        router.push('/clients'); 
        router.refresh();
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat data...</div>;
  if (!client) return <div className="min-h-screen flex items-center justify-center text-red-500">Data tidak ditemukan!</div>;

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={20} /> Kembali
        </button>

        <div className="flex gap-3">
          {/* TOMBOL EDIT */}
          <Link href={`/clients/${id}/edit`}>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors border border-indigo-100 shadow-sm">
              <Pencil size={16} /> Edit Data
            </button>
          </Link>

          {/* TOMBOL HAPUS (MERAH) */}
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-sm font-medium transition-colors border border-rose-100 shadow-sm"
          >
            {isDeleting ? 'Menghapus...' : <><Trash2 size={16} /> Hapus Pelanggan</>}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* INFO UTAMA */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          {/* Hiasan Status Background */}
          <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-16 -translate-y-16 rounded-full opacity-10 ${
            (client['STATUS'] || '').toLowerCase().includes('active') ? 'bg-green-500' : 'bg-red-500'
          }`}></div>

          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{client['Nama Pelanggan']}</h1>
                <StatusBadge status={client['STATUS']} />
              </div>
              <p className="text-slate-500 font-mono text-lg flex items-center gap-2">
                <span className="text-slate-300">#</span>
                {client['ID Pelanggan']}
              </p>
            </div>
            <div className="text-right">
               <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Bandwidth</p>
               <p className="text-xl font-bold text-blue-600">{client['Kapasitas'] || '-'}</p>
            </div>
          </div>
        </div>

        {/* DETAIL GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LOKASI */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b">
              <MapPin size={18} className="text-blue-500" /> Informasi Lokasi
            </h3>
            <div className="space-y-4">
              <InfoRow label="Alamat Instalasi" value={client['ALAMAT']} />
              <InfoRow label="Account Officer" value={client['Officer']} />
            </div>
          </div>

          {/* TEKNIS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b">
              <Activity size={18} className="text-emerald-500" /> Data Teknis
            </h3>
            <div className="space-y-4">
              <InfoRow label="VLAN / VMAN" value={client['VMAN / VLAN']} isMono />
              <InfoRow label="Sinyal RX (dBm)" value={client['RX ONT/SFP']} isSignal />
              <InfoRow label="Link MRTG" value={client['MRTG'] || 'Belum ada'} isLink />
            </div>
          </div>

           {/* PERANGKAT */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2">
             <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-2 border-b">
              <Router size={18} className="text-orange-500" /> Perangkat Terpasang
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 flex justify-between items-center">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Near End (POP)</p>
                    <p className="font-mono font-medium text-slate-700 text-lg">{client['Near End'] || '-'}</p>
                </div>
                <Server className="text-slate-300" size={24}/>
              </div>
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 flex justify-between items-center">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Far End (CPE)</p>
                    <p className="font-mono font-medium text-slate-700 text-lg">{client['Far End'] || '-'}</p>
                </div>
                 <Router className="text-slate-300" size={24}/>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function InfoRow({ label, value, isMono, isSignal, isLink }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {isSignal ? (
         <span className={`font-mono font-bold ${parseFloat(value) < -27 ? 'text-red-600' : 'text-green-600'}`}>
           {value || '-'}
         </span>
      ) : isLink && value !== 'Belum ada' ? (
         <a href={value} target="_blank" className="text-blue-500 hover:underline truncate block text-sm font-medium">{value}</a>
      ) : (
        <p className={`text-slate-800 font-medium ${isMono ? 'font-mono text-blue-700' : ''}`}>
          {value || '-'}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  let color = 'bg-slate-100 text-slate-600 border-slate-200';
  
  if (s.includes('active') || s.includes('ok')) color = 'bg-green-100 text-green-700 border-green-200';
  if (s.includes('suspend') || s.includes('isolir')) color = 'bg-red-100 text-red-700 border-red-200';
  if (s.includes('dismantle')) color = 'bg-slate-200 text-slate-700 border-slate-300';
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${color}`}>
      {status || 'Unknown'}
    </span>
  );
}
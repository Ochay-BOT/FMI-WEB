'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { 
  Search, Plus, Filter, ChevronLeft, ChevronRight, 
  MoreHorizontal, Users, Signal 
} from 'lucide-react';

export default function ClientListPage() {
  // --- STATE ---
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // State Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const ITEMS_PER_PAGE = 10; // Jumlah data per halaman

  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

  // --- FETCH DATA (Canggih) ---
  async function fetchClients() {
    setLoading(true);

    // 1. Hitung Range Baris (misal Hal 1: baris 0-9, Hal 2: baris 10-19)
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('Data Client Corporate')
      .select('*', { count: 'exact' }); // Minta total jumlah data juga

    // Jika ada pencarian, filter dulu
    if (search) {
      query = query.or(`"Nama Pelanggan".ilike.%${search}%,"ID Pelanggan".ilike.%${search}%`);
    }

    // Eksekusi dengan Range (Pagination)
    const { data, count, error } = await query
      .order('id', { ascending: false }) // Data terbaru di atas
      .range(from, to);

    if (error) {
      console.error('Error:', error);
    } else {
      setClients(data || []);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    }
    setLoading(false);
  }

  // Efek: Jalankan fetch saat Halaman ganti atau Search diketik
  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]); 

  // Reset ke halaman 1 jika user mengetik search baru
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1); 
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" /> Data Client Corporate
          </h1>
          <p className="text-sm text-slate-500">Database pelanggan aktif & teknis</p>
        </div>
        
        <Link href="/clients/create">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
            <Plus size={20} /> Client Baru
          </button>
        </Link>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          {/* PERBAIKAN: Menambahkan text-slate-700 */}
          <input 
            type="text" 
            placeholder="Cari Nama / ID Pelanggan..." 
            value={search}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
          <Filter size={16} />
          <span>Total: <b>{totalRecords}</b> Pelanggan</span>
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ID Pelanggan</th>
                <th className="px-6 py-4">Nama Pelanggan</th>
                <th className="px-6 py-4">Layanan</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Sinyal</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Skeleton Loading (Biar Keren)
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : clients.length > 0 ? (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs font-bold">
                      #{client['ID Pelanggan']}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-base">{client['Nama Pelanggan']}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPinIcon /> {client['ALAMAT'] ? client['ALAMAT'].substring(0, 30) + '...' : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                        {client['Kapasitas'] || 'Default'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={client['STATUS']} />
                    </td>
                    <td className="px-6 py-4 text-center">
                       {/* Indikator Sinyal Warna-Warni */}
                       <SignalIndicator value={client['RX ONT/SFP']} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/clients/${client.id}`}>
                        <button className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold mx-auto">
                           Detail <ChevronRight size={14} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS (BAWAH) */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button 
            disabled={page === 1 || loading}
            onClick={() => setPage(page - 1)}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-700"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <span className="text-sm text-slate-600 font-medium">
            Halaman <span className="text-blue-600 font-bold">{page}</span> dari {totalPages}
          </span>

          <button 
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-700"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  let color = 'bg-slate-100 text-slate-600 border-slate-200';
  
  if (s.includes('active') || s.includes('ok')) color = 'bg-green-100 text-green-700 border-green-200';
  if (s.includes('suspend') || s.includes('isolir')) color = 'bg-red-100 text-red-700 border-red-200';
  if (s.includes('dismantle')) color = 'bg-slate-200 text-slate-700 border-slate-300';
  
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${color}`}>
      {status || 'Unknown'}
    </span>
  );
}

function SignalIndicator({ value }) {
  const val = parseFloat(value);
  if (!value) return <span className="text-slate-300">-</span>;

  let color = 'text-green-600';
  if (val < -27) color = 'text-red-500 animate-pulse'; // Sinyal jelek kedip-kedip
  else if (val < -24) color = 'text-amber-500';

  return (
    <div className={`flex items-center justify-center gap-1 font-mono font-bold ${color}`}>
      <Signal size={14} />
      {value}
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  );
}
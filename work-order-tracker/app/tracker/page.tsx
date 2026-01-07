'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link'; // IMPORT LINK DITAMBAHKAN
import { 
  Search, RefreshCcw, Download, ChevronDown, X, 
  TrendingUp, UserPlus, Server, Globe, Plus // IMPORT ICON PLUS DITAMBAHKAN
} from 'lucide-react';
import { format } from 'date-fns';

// Setup ApexCharts (No SSR)
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TABLE_MAP = {
  'Pelanggan Baru': 'Berlangganan 2026',
  'Berhenti Langganan': 'Berhenti Berlangganan 2026',
  'Cuti / Isolir': 'Berhenti Sementara 2026',
  'Upgrade Layanan': 'Upgrade 2026',
  'Downgrade Layanan': 'Downgrade 2026'
};

export default function TrackerPage() {
  // --- STATE UTAMA ---
  const [selectedCategory, setSelectedCategory] = useState('Pelanggan Baru');
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
   
  // State Modal Global Stats
  const [showModal, setShowModal] = useState(false);
  const [modalChartMode, setModalChartMode] = useState('ISP'); // 'ISP' atau 'BTS'
  const [globalStats, setGlobalStats] = useState({ 
    pasang: 0, putus: 0, cuti: 0, netGrowth: 0,
    byIsp: [], byBts: [] // Tambahkan array byBts
  });

  // State Chart Halaman Utama
  const [chartTrend, setChartTrend] = useState({ series: [], options: {} });
  const [chartTeam, setChartTeam] = useState({ series: [], options: {} });

  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

  // --- 1. FETCH DATA UTAMA (Sesuai Dropdown) ---
  async function fetchData() {
    setLoading(true);
    const tableName = TABLE_MAP[selectedCategory];
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('TANGGAL', { ascending: false });

    if (error) {
      console.error('Error fetching:', error);
    } else {
      setDataList(data || []);
      processMainCharts(data || [], selectedCategory);
    }
    setLoading(false);
  }

  // --- 2. FETCH GLOBAL STATS (Untuk Modal) ---
  async function fetchGlobalStats() {
    const [resPasang, resPutus, resCuti] = await Promise.all([
      supabase.from('Berlangganan 2026').select('id, ISP, BTS'), // Ambil kolom BTS juga
      supabase.from('Berhenti Berlangganan 2026').select('id'),
      supabase.from('Berhenti Sementara 2026').select('id')
    ]);

    const pasang = resPasang.data?.length || 0;
    const putus = resPutus.data?.length || 0;
    const cuti = resCuti.data?.length || 0;
    const netGrowth = pasang - putus;

    // --- OLAH DATA CHART MODAL ---
    const ispMap = {};
    const btsMap = {};

    resPasang.data?.forEach(row => {
      // Hitung per ISP
      const isp = row.ISP || 'Unknown';
      ispMap[isp] = (ispMap[isp] || 0) + 1;

      // Hitung per BTS (Logika Baru)
      const bts = row.BTS || 'Unknown';
      btsMap[bts] = (btsMap[bts] || 0) + 1;
    });

    // Urutkan Top 15 ISP
    const byIsp = Object.keys(ispMap)
      .map(k => ({ name: k, data: ispMap[k] }))
      .sort((a,b) => b.data - a.data)
      .slice(0, 15);

    // Urutkan Top 15 BTS
    const byBts = Object.keys(btsMap)
      .map(k => ({ name: k, data: btsMap[k] }))
      .sort((a,b) => b.data - a.data)
      .slice(0, 15);

    setGlobalStats({ pasang, putus, cuti, netGrowth, byIsp, byBts });
  }

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  // --- 3. PROSES CHART HALAMAN UTAMA ---
  const processMainCharts = (data, category) => {
    const dateMap = {};
    data.forEach(row => {
      if(row.TANGGAL) {
        const d = row.TANGGAL.substring(0, 7); 
        dateMap[d] = (dateMap[d] || 0) + 1;
      }
    });
    const sortedDates = Object.keys(dateMap).sort();
    
    let color = '#10b981'; 
    if(category.includes('Berhenti') || category.includes('Cuti')) color = '#ef4444'; 
    if(category.includes('Upgrade') || category.includes('Downgrade')) color = '#3b82f6'; 

    setChartTrend({
      series: [{ name: 'Jumlah Transaksi', data: sortedDates.map(d => dateMap[d]) }],
      options: {
        chart: { type: 'area', toolbar: { show: false } },
        xaxis: { categories: sortedDates },
        colors: [color],
        stroke: { curve: 'smooth' },
        title: { text: `Tren ${category}`, style: { fontSize: '14px', fontWeight: 'bold' } },
        grid: { borderColor: '#f1f5f9' }
      }
    });

    const teamMap = {};
    data.forEach(row => {
      const t = row.TEAM || 'Unknown';
      teamMap[t] = (teamMap[t] || 0) + 1;
    });
    const sortedTeams = Object.keys(teamMap).sort((a,b) => teamMap[b] - teamMap[a]).slice(0, 5);

    setChartTeam({
      series: [{ name: 'Jumlah', data: sortedTeams.map(t => teamMap[t]) }],
      options: {
        chart: { type: 'bar', toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '50%' } },
        xaxis: { categories: sortedTeams },
        colors: [color],
        title: { text: 'Top Team Performance', style: { fontSize: '14px', fontWeight: 'bold' } },
        grid: { borderColor: '#f1f5f9' }
      }
    });
  };

  // --- HELPER SUBJECT ---
  const getSubject = (row) => {
    return row['SUBJECT BERLANGGANAN'] || 
           row['SUBJECT BERHENTI BERLANGGANAN'] || 
           row['SUBJECT BERHENTI SEMENTARA'] || 
           row['SUBJECT UPGRADE'] || 
           row['SUBJECT DOWNGRADE'] || 
           row['SUBJECT WO'] || 
           row['SUBJECT'] || 
           '-'; 
  };

  const filteredData = dataList.filter(item => {
    const s = search.toLowerCase();
    const subject = getSubject(item);
    return subject.toLowerCase().includes(s) || (item.BTS || '').toLowerCase().includes(s);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="text-emerald-600" /> Tracker Pelanggan 2026
          </h1>
          <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-bold">
            {dataList.length} Records
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          
          {/* TOMBOL INPUT BARU (NEW) */}
          <Link href="/tracker/create">
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/30">
              <Plus size={20} /> Input Tracker
            </button>
          </Link>

          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 min-w-[200px] justify-between shadow-sm">
              {selectedCategory}
              <ChevronDown size={16} />
            </button>
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block z-10">
              {Object.keys(TABLE_MAP).map(cat => (
                <div key={cat} onClick={() => setSelectedCategory(cat)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b last:border-0">
                  {cat}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition-all">
            <TrendingUp size={16} /> Global Stats
          </button>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="h-72">
            {chartTrend.series.length > 0 && <ReactApexChart options={chartTrend.options} series={chartTrend.series} type="area" height="100%" />}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="h-72">
            {chartTeam.series.length > 0 && <ReactApexChart options={chartTeam.options} series={chartTeam.series} type="bar" height="100%" />}
          </div>
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-700">Data: {selectedCategory}</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Cari Subject / BTS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64 transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Problem / Ket</th>
                <th className="px-6 py-3">Team</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3">BTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan="6" className="p-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-500 text-xs font-mono">
                      {row.TANGGAL ? format(new Date(row.TANGGAL), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        selectedCategory.includes('Berhenti') || selectedCategory.includes('Cuti')
                          ? 'bg-red-50 text-red-700 border-red-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {getSubject(row)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 max-w-xs truncate">
                      {row['PROBLEM'] || row['REASON'] || row['KETERANGAN'] || '-'}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">{row.TEAM || '-'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase border border-green-200">
                        {row.STATUS || 'OK'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-mono text-xs">{row.BTS || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Data tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL GLOBAL STATS (POPUP) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            
            {/* Header Modal */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp size={20} /> Global Summary 2026
              </h2>
              <button onClick={() => setShowModal(false)} className="hover:bg-slate-700 p-1 rounded transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Row 1: 4 Kartu Utama */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-red-500 text-white p-5 rounded-xl shadow-lg">
                  <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Net Growth</p>
                  <h3 className="text-4xl font-bold mt-1">{globalStats.netGrowth}</h3>
                  <p className="text-xs mt-2 opacity-90 font-medium">
                    {globalStats.netGrowth > 0 ? '▲ Pertumbuhan Positif' : '▼ Penurunan Pelanggan'}
                  </p>
                </div>
                <div className="bg-white border p-5 rounded-xl shadow-sm border-l-4 border-l-emerald-500">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pasang</p>
                  <h3 className="text-3xl font-bold text-emerald-600 mt-1">{globalStats.pasang}</h3>
                </div>
                <div className="bg-white border p-5 rounded-xl shadow-sm border-l-4 border-l-red-500">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Putus</p>
                  <h3 className="text-3xl font-bold text-red-600 mt-1">{globalStats.putus}</h3>
                </div>
                 <div className="bg-white border p-5 rounded-xl shadow-sm border-l-4 border-l-amber-500">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sedang Cuti</p>
                  <h3 className="text-3xl font-bold text-amber-600 mt-1">{globalStats.cuti}</h3>
                </div>
              </div>

              {/* Row 2: Chart Besar di Modal */}
              <div className="bg-white border rounded-xl p-6 shadow-sm">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="font-bold text-slate-700 text-lg">
                      Distribusi WO Berdasarkan {modalChartMode}
                    </h3>

                    {/* TOMBOL SWITCHER CHART */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setModalChartMode('ISP')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                          modalChartMode === 'ISP' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Globe size={14} /> Per ISP
                      </button>
                      <button 
                        onClick={() => setModalChartMode('BTS')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                          modalChartMode === 'BTS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Server size={14} /> Per BTS
                      </button>
                    </div>
                 </div>

                 <div className="h-96">
                   <ReactApexChart 
                      type="bar" 
                      height="100%"
                      // LOGIC SWITCH DATA:
                      series={[{ 
                        name: 'Jumlah', 
                        data: modalChartMode === 'ISP' 
                          ? globalStats.byIsp.map(i => i.data) 
                          : globalStats.byBts.map(i => i.data) 
                      }]}
                      options={{
                        chart: { toolbar: { show: false } },
                        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '65%' } },
                        colors: ['#3b82f6'],
                        dataLabels: { enabled: true, textAnchor: 'start', style: { colors: ['#fff'] }, offsetX: 0 },
                        // LOGIC SWITCH KATEGORI:
                        xaxis: { 
                          categories: modalChartMode === 'ISP'
                            ? globalStats.byIsp.map(i => i.name)
                            : globalStats.byBts.map(i => i.name)
                        },
                        grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } }
                      }}
                    />
                 </div>
              </div>

            </div>
            
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium transition-colors shadow-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
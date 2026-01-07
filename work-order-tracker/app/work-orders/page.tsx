'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic'; 
import { createBrowserClient } from '@supabase/ssr'; // GANTI IMPORT INI
import Link from 'next/link'; 
import { 
  Search, RefreshCcw, CheckCircle, Clock, AlertTriangle, FileText, 
  BarChart3, PieChart, Activity, Plus 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';

// --- SETUP APEXCHARTS ---
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function WorkOrderDashboard() {
  // 1. SETUP SUPABASE YANG BENAR (SINGLETON)
  // Menggunakan useState(() => ...) agar client hanya dibuat sekali saat render pertama
  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

  const [dataWO, setDataWO] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
   
  // State Statistik & Grafik
  const [stats, setStats] = useState({ total: 0, solved: 0, pending: 0, open: 0 });
  const [chartTeam, setChartTeam] = useState({ series: [], options: {} });
  const [chartJenis, setChartJenis] = useState({ series: [], options: {} });
  const [chartDaily, setChartDaily] = useState({ series: [], options: {} });

  // --- 2. AMBIL DATA ---
  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('Report Bulanan')
      .select('*')
      .order('TANGGAL', { ascending: false });

    if (error) {
      console.error('Error:', error);
    } else {
      setDataWO(data || []);
      processAnalytics(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // --- 3. OLAH DATA ANALYTICS ---
  const processAnalytics = (data) => {
    // A. Hitung Kartu Statistik
    const total = data.length;
    const solved = data.filter(r => (r.STATUS || '').toLowerCase().includes('solved') || (r.STATUS || '').toLowerCase().includes('closed')).length;
    const pending = data.filter(r => (r.STATUS || '').toLowerCase().includes('pending')).length;
    const open = data.filter(r => ['open', 'down', 'on progress'].includes((r.STATUS || '').toLowerCase())).length;
    setStats({ total, solved, pending, open });

    // B. Kinerja Team
    const teamMap = {};
    data.forEach(r => {
      const name = r['NAMA TEAM'] || 'Unknown';
      teamMap[name] = (teamMap[name] || 0) + 1;
    });
    
    setChartTeam({
      series: [{ name: 'Jumlah WO', data: Object.values(teamMap) }],
      options: {
        chart: { type: 'bar', toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '55%' } },
        dataLabels: { enabled: false },
        xaxis: { categories: Object.keys(teamMap) },
        colors: ['#3b82f6'], 
        grid: { borderColor: '#f1f5f9' }
      }
    });

    // C. Jenis Gangguan
    const jenisMap = {};
    data.forEach(r => {
      const jenis = r['JENIS WO'] || 'Lainnya';
      jenisMap[jenis] = (jenisMap[jenis] || 0) + 1;
    });

    setChartJenis({
      series: Object.values(jenisMap),
      options: {
        chart: { type: 'donut' },
        labels: Object.keys(jenisMap),
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        legend: { position: 'bottom' },
        dataLabels: { enabled: true },
        plotOptions: { pie: { donut: { size: '65%' } } }
      }
    });

    // D. Daily Trend
    const dailyMap = {};
    data.forEach(r => {
      if (r.TANGGAL) {
        const dateStr = r.TANGGAL.substring(0, 10);
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
      }
    });
    const sortedDates = Object.keys(dailyMap).sort().slice(-7);
    const dailyCounts = sortedDates.map(d => dailyMap[d]);
    const dailyLabels = sortedDates.map(d => {
      try { return format(parseISO(d), 'd MMM', { locale: indonesia }); } catch { return d; }
    });

    setChartDaily({
      series: [{ name: 'WO Harian', data: dailyCounts }],
      options: {
        chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: dailyLabels },
        colors: ['#f59e0b'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.2, stops: [0, 90, 100] } },
        grid: { borderColor: '#f1f5f9' }
      }
    });
  };

  const filteredData = dataWO.filter(item => {
    const s = search.toLowerCase();
    return (
      (item['SUBJECT WO'] || '').toLowerCase().includes(s) ||
      (item['NAMA TEAM'] || '').toLowerCase().includes(s) ||
      (item['STATUS'] || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans space-y-6">
       
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Dashboard Analytics
          </h1>
          <p className="text-sm text-slate-500">Monitoring Performance & Work Orders</p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Link href="/work-orders/create">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
              <Plus size={20} /> Buat WO Baru
            </button>
          </Link>
          
          <button onClick={fetchData} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="TOTAL WO" count={stats.total} color="bg-blue-600" icon={<FileText size={40} className="opacity-20" />} />
        <StatCard title="SOLVED" count={stats.solved} color="bg-emerald-500" icon={<CheckCircle size={40} className="opacity-20" />} />
        <StatCard title="PENDING" count={stats.pending} color="bg-amber-500" icon={<Clock size={40} className="opacity-20" />} />
        <StatCard title="OPEN / PROG" count={stats.open} color="bg-rose-500" icon={<AlertTriangle size={40} className="opacity-20" />} />
      </div>

      {/* CHARTS AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 size={18} /> KINERJA TEAM</h3>
          <div className="h-72">
            {chartTeam.series.length > 0 && <ReactApexChart options={chartTeam.options} series={chartTeam.series} type="bar" height="100%" />}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieChart size={18} /> JENIS GANGGUAN</h3>
          <div className="h-72 flex justify-center items-center">
             {chartJenis.series.length > 0 && <ReactApexChart options={chartJenis.options} series={chartJenis.series} type="donut" height={280} />}
          </div>
        </div>
      </div>

      {/* CHART ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Activity size={18} /> DAILY TREND (7 HARI TERAKHIR)</h3>
          <div className="h-64">
             {chartDaily.series.length > 0 && <ReactApexChart options={chartDaily.options} series={chartDaily.series} type="area" height="100%" />}
          </div>
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">{filteredData.length} Records</span>
            <h3 className="font-bold text-slate-800">Detail Laporan</h3>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input type="text" placeholder="Cari Subject / Team..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-4 py-2 border rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Subject WO</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Jenis</th>
                <th className="px-6 py-4">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{row.TANGGAL ? format(new Date(row.TANGGAL), 'dd MMM yyyy') : '-'}</td>
                  <td className="px-6 py-4 font-medium text-slate-800 max-w-xs truncate" title={row['SUBJECT WO']}>{row['SUBJECT WO']}</td>
                  <td className="px-6 py-4 text-center"><BadgeStatus text={row.STATUS} /></td>
                  <td className="px-6 py-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200 uppercase">{row['JENIS WO'] || '-'}</span></td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{row['NAMA TEAM']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// HELPER COMPONENTS
function StatCard({ title, count, color, icon }) {
  return (
    <div className={`${color} p-6 rounded-xl shadow-lg text-white relative overflow-hidden`}>
      <div className="relative z-10"><p className="text-xs font-bold opacity-80 mb-1">{title}</p><h3 className="text-4xl font-bold">{count}</h3></div>
      <div className="absolute right-[-10px] bottom-[-10px] transform rotate-12">{icon}</div>
    </div>
  );
}

function BadgeStatus({ text }) {
  const s = (text || '').toLowerCase();
  let style = 'bg-slate-100 text-slate-600 border-slate-200';
  if (s.includes('solved') || s.includes('closed') || s.includes('done')) style = 'bg-green-100 text-green-700 border-green-200';
  else if (s.includes('pending')) style = 'bg-amber-100 text-amber-700 border-amber-200';
  else if (s.includes('open') || s.includes('down') || s.includes('progress')) style = 'bg-red-100 text-red-700 border-red-200';
  return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${style} uppercase`}>{text || '-'}</span>;
}
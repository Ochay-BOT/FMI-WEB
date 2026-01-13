'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import Link from 'next/link'; 
import { 
  Users, Server, ArrowUpRight, Clock, 
  Sun, Moon, CalendarDays, Inbox, CheckCircle2, ArrowRight,
  Download, X, ListTodo, BarChart3, TrendingUp, ArrowDownRight, MinusCircle, 
  AlertTriangle, Calendar, ChevronLeft, ChevronRight, ExternalLink, List
} from 'lucide-react';
import { format, getISOWeek } from 'date-fns'; 
import { id as indonesia } from 'date-fns/locale';
import { Role } from '@/lib/permissions';

import AlertBanner from '@/components/AlertBanner';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TEAM_CONFIG = {
  teamA: ['Anan', 'Shidiq'], 
  teamB: ['Ilham', 'Andi'],
  isWeekA_Morning: getISOWeek(new Date()) % 2 !== 0 
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userFullName, setUserFullName] = useState('');
  
  // State Dashboard
  const [stats, setStats] = useState({
    totalClient: 0, activeClient: 0,
    totalVlanUsed: 0, totalVlanFree: 0,
    growthMonth: 0, logsToday: 0,
    woPending: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  
  // STATE CHART
  const [chartTab, setChartTab] = useState<'CLIENT' | 'CAPACITY'>('CLIENT');
  const [chartData, setChartData] = useState<any>({ client: [], capacity: [] });
  const [chartSummary, setChartSummary] = useState({ pasang: 0, putus: 0, cuti: 0, upgrade: 0, downgrade: 0 });
  
  // STATE BANNER & MODAL
  const [pendingWOs, setPendingWOs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [showAllWOModal, setShowAllWOModal] = useState(false);

  // STATE INBOX
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false); 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const morningSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamA : TEAM_CONFIG.teamB;
  const afternoonSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamB : TEAM_CONFIG.teamA;

  // --- FETCH DATA ---
  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserName = '';

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
        if (profile) {
            setUserRole(profile.role as Role);
            setUserFullName(profile.full_name);
            currentUserName = profile.full_name;
        }
      }

      // Logic Inbox
      if (currentUserName) {
        const { data: tasks } = await supabase.from('Report Bulanan').select('*').eq('NAMA TEAM', currentUserName).not('STATUS', 'in', '("SOLVED","CLOSED")').order('TANGGAL', { ascending: false });
        if (tasks) setMyTasks(tasks);
      }

      // Stats
      const { count: clientCount } = await supabase.from('Data Client Corporate').select('*', { count: 'exact', head: true });
      const { count: woCount } = await supabase.from('Report Bulanan').select('*', { count: 'exact', head: true }).in('STATUS', ['PENDING', 'OPEN', 'PROGRESS', 'ON PROGRESS']);
      
      const vlanTables = ['Daftar Vlan 1-1000', 'Daftar Vlan 1000+', 'Daftar Vlan 2000+', 'Daftar Vlan 3000+'];
      const vlanResults = await Promise.all(vlanTables.map(table => supabase.from(table).select('NAME')));
      let vlanUsed = 0, vlanTotal = 0;
      vlanResults.forEach(res => {
        const d = res.data || [];
        vlanTotal += d.length;
        vlanUsed += d.filter(r => r.NAME && r.NAME !== '-' && r.NAME !== 'AVAILABLE').length;
      });

      // Chart Data
      const tables = ['Berlangganan 2026', 'Berhenti Berlangganan 2026', 'Berhenti Sementara 2026', 'Upgrade 2026', 'Downgrade 2026'];
      const responses = await Promise.all(tables.map(t => supabase.from(t).select('TANGGAL')));
      const groupByMonth = (data: any[]) => {
        const months = new Array(12).fill(0);
        data?.forEach(row => { if (row.TANGGAL) months[new Date(row.TANGGAL).getMonth()]++; });
        return months;
      };
      const d1 = groupByMonth(responses[0].data || []); // Pasang
      const d2 = groupByMonth(responses[1].data || []); // Putus
      const d3 = groupByMonth(responses[2].data || []); // Cuti
      const d4 = groupByMonth(responses[3].data || []); // Upgrade
      const d5 = groupByMonth(responses[4].data || []); // Downgrade

      setChartData({
        client: [{ name: 'Pasang Baru', data: d1 }, { name: 'Berhenti', data: d2 }, { name: 'Cuti', data: d3 }],
        capacity: [{ name: 'Upgrade', data: d4 }, { name: 'Downgrade', data: d5 }]
      });
      setChartSummary({
        pasang: d1.reduce((a, b) => a + b, 0), putus: d2.reduce((a, b) => a + b, 0), cuti: d3.reduce((a, b) => a + b, 0),
        upgrade: d4.reduce((a, b) => a + b, 0), downgrade: d5.reduce((a, b) => a + b, 0),
      });

      // Logs & Pending WO
      const today = new Date().toISOString().slice(0, 10);
      const { data: logs } = await supabase.from('Log_Aktivitas').select('*').order('created_at', { ascending: false }).limit(5);
      const { count: countToday } = await supabase.from('Log_Aktivitas').select('id', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00');
      const { data: allPending } = await supabase.from('Report Bulanan').select('*').in('STATUS', ['PENDING', 'OPEN', 'PROGRESS', 'ON PROGRESS']).order('id', { ascending: false }).limit(50);
      if (allPending) setPendingWOs(allPending);

      setStats({
        totalClient: clientCount || 0, activeClient: 0,
        totalVlanUsed: vlanUsed, totalVlanFree: vlanTotal - vlanUsed,
        growthMonth: d1[new Date().getMonth()],
        logsToday: countToday || 0,
        woPending: woCount || 0
      });
      setRecentLogs(logs || []);

    } catch (err) { console.error("Error:", err); } 
    finally { setLoading(false); }
  }

  useEffect(() => { fetchDashboardData(); }, []);

  // --- LOGIC LAIN ---
  const handleDownloadInbox = () => {
    if (myTasks.length === 0) return alert("Tidak ada tugas.");
    let content = `TO DO LIST - ${userFullName}\nGenerated: ${format(new Date(), 'dd MMM yyyy HH:mm')}\n==========================\n\n`;
    myTasks.forEach((task, index) => {
      content += `${index + 1}. [${task.STATUS}] ${task['SUBJECT WO']}\n   Tgl: ${task.TANGGAL}\n   Ket: ${task.KETERANGAN || '-'}\n--------------------------\n`;
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    link.download = `Inbox_${userFullName}.txt`;
    link.click();
  };

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % pendingWOs.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + pendingWOs.length) % pendingWOs.length);
  const currentBannerWO = pendingWOs.length > 0 ? pendingWOs[currentIndex] : null;

  const chartOptions: any = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', stacked: false },
    colors: chartTab === 'CLIENT' ? ['#10b981', '#ef4444', '#f59e0b'] : ['#3b82f6', '#64748b'],
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], labels: { style: { colors: '#0f172a', fontSize: '12px', fontWeight: 800 } } },
    yaxis: { show: false },
    grid: { show: true, borderColor: '#f1f5f9' },
    legend: { position: 'top', horizontalAlign: 'right', fontWeight: 700, labels: { colors: '#334155' } },
    tooltip: { theme: 'light' }
  };

  // --- SKELETON LOADING ---
  if (loading) return <DashboardSkeleton />;

  // --- MAIN VIEW ---
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans relative">
      <AlertBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <StatCard title="Total Client" value={stats.totalClient} sub={`Active: ${stats.activeClient}`} icon={<Users size={24} />} color="blue" />
        <StatCard title="WO Pending" value={stats.woPending} sub="Needs Action" icon={<Activity size={24} />} color="purple" />
        <StatCard title="VLAN Usage" value={stats.totalVlanUsed} sub={`Free: ${stats.totalVlanFree}`} icon={<Server size={24} />} color="emerald" />
        <StatCard title="Logs Today" value={stats.logsToday} sub="System Events" icon={<Clock size={24} />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
          <div className="p-6 pb-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    {chartTab === 'CLIENT' ? <Users size={20} className="text-emerald-600"/> : <BarChart3 size={20} className="text-blue-600"/>}
                    {chartTab === 'CLIENT' ? 'Pertumbuhan Pelanggan' : 'Pertumbuhan Kapasitas'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Data statistik tahun 2026</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setChartTab('CLIENT')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'CLIENT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Client Growth</button>
                    <button onClick={() => setChartTab('CAPACITY')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'CAPACITY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Capacity</button>
                </div>
            </div>
            <div className="flex-1 min-h-[280px]">
                <ReactApexChart options={chartOptions} series={chartTab === 'CLIENT' ? chartData.client : chartData.capacity} type="bar" height={280} />
            </div>
          </div>
          <div className="mt-auto bg-slate-50 border-t border-slate-100 p-6 rounded-b-xl">
             <div className="grid grid-cols-3 gap-4">
               {chartTab === 'CLIENT' ? (
                 <>
                   <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Pasang</p><div className="flex items-center gap-2"><span className="p-1 bg-emerald-100 text-emerald-600 rounded"><ArrowUpRight size={14}/></span><span className="text-xl font-black text-slate-800">{chartSummary.pasang}</span></div></div>
                   <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Putus</p><div className="flex items-center gap-2"><span className="p-1 bg-rose-100 text-rose-600 rounded"><ArrowDownRight size={14}/></span><span className="text-xl font-black text-slate-800">{chartSummary.putus}</span></div></div>
                   <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Sedang Cuti</p><div className="flex items-center gap-2"><span className="p-1 bg-amber-100 text-amber-600 rounded"><MinusCircle size={14}/></span><span className="text-xl font-black text-slate-800">{chartSummary.cuti}</span></div></div>
                 </>
               ) : (
                 <>
                   <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Upgrade</p><div className="flex items-center gap-2"><span className="p-1 bg-blue-100 text-blue-600 rounded"><TrendingUp size={14}/></span><span className="text-xl font-black text-slate-800">{chartSummary.upgrade}</span></div></div>
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Downgrade</p><div className="flex items-center gap-2"><span className="p-1 bg-slate-100 text-slate-600 rounded"><TrendingUp size={14} className="rotate-180"/></span><span className="text-xl font-black text-slate-800">{chartSummary.downgrade}</span></div></div>
                 </>
               )}
             </div>
          </div>
        </div>

        {/* SCHEDULE & LOGS */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600"/> Jadwal Minggu Ini
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">Week {getISOWeek(new Date())}</span>
            </div>
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2 mb-2"><Sun size={16} className="text-amber-500" /><p className="text-xs font-bold text-amber-700 uppercase text-[10px]">Pagi (08.00 - 16.00)</p></div>
                <div className="flex gap-2">{morningSquad.map((name, i) => <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded shadow-sm border border-amber-200 flex-1 text-center">{name}</span>)}</div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2 mb-2"><Moon size={16} className="text-indigo-500" /><p className="text-xs font-bold text-indigo-700 uppercase text-[10px]">Siang (14.00 - 22.00)</p></div>
                <div className="flex gap-2">{afternoonSquad.map((name, i) => <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded shadow-sm border border-indigo-200 flex-1 text-center">{name}</span>)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800 text-sm">Aktivitas Terkini</h3></div>
            <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-50">
              {recentLogs.length === 0 ? <p className="p-4 text-center text-xs text-slate-400 font-medium">Kosong</p> : 
                recentLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 flex gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{log.ACTIVITY?.substring(0,2) || 'SY'}</div><div className="overflow-hidden"><p className="text-xs font-bold text-slate-700">{log.actor}</p><p className="text-[10px] text-slate-500 truncate">{log.SUBJECT}</p><p className="text-[9px] text-slate-400 mt-0.5">{log.created_at ? format(new Date(log.created_at), 'HH:mm') : '-'}</p></div></div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* --- BANNER WO & MODAL LIHAT SEMUA --- */}
      {currentBannerWO && (
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm transition-all group mt-8">
          <div className="absolute top-0 bottom-0 left-0 w-2 bg-rose-600"></div> 
          <div className="p-6 pl-8 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-200">
                  <AlertTriangle size={12} /> PERHATIAN (WO ACTIVE)
                </span>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {currentIndex + 1} / {pendingWOs.length}
                </span>
              </div>
              <h3 className="text-xl font-black text-black leading-tight mb-2 line-clamp-2">{currentBannerWO['SUBJECT WO']}</h3>
              <div className="flex items-center gap-2">
                 <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-200">
                    {currentBannerWO.STATUS}
                 </span>
                 <p className="text-slate-600 font-bold text-sm italic line-clamp-1">"{currentBannerWO['KETERANGAN'] || '-'}"</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
               <div className="hidden md:block bg-rose-50 text-rose-700 px-3 py-2 rounded-lg border border-rose-100 text-center min-w-[100px]">
                  <div className="flex items-center justify-center gap-1 text-xs font-bold uppercase mb-0.5">
                     <Calendar size={12}/> {currentBannerWO.TANGGAL ? format(new Date(currentBannerWO.TANGGAL), 'dd MMM') : '-'}
                  </div>
                  <span className="text-[10px] font-bold opacity-70">Jadwal</span>
               </div>
               <div className="flex bg-white border border-slate-200 rounded-lg shadow-sm">
                  <button onClick={handlePrev} className="p-2.5 hover:bg-slate-50 text-slate-600 border-r border-slate-200"><ChevronLeft size={18}/></button>
                  <button onClick={handleNext} className="p-2.5 hover:bg-slate-50 text-slate-600"><ChevronRight size={18}/></button>
               </div>
               <button onClick={() => setShowAllWOModal(true)} className="px-5 py-3 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700 transition shadow-lg shadow-rose-200 whitespace-nowrap flex items-center gap-2">
                 <List size={16}/> Lihat Semua ({pendingWOs.length})
               </button>
            </div>
          </div>
        </div>
      )}

      {showAllWOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={20} className="text-rose-600"/> Daftar WO Pending</h3><p className="text-xs text-slate-500 mt-1">Total {pendingWOs.length} Work Order.</p></div>
                 <button onClick={() => setShowAllWOModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
                 {pendingWOs.map((wo) => (
                    <div key={wo.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-rose-300 transition flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                       <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200 uppercase">{wo.STATUS}</span><span className="text-[10px] font-mono text-slate-400">#{wo.id}</span></div>
                          <h4 className="font-bold text-slate-800 text-sm mb-1">{wo['SUBJECT WO']}</h4>
                          <p className="text-xs text-slate-500 italic line-clamp-1">{wo['KETERANGAN']}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <Link href={`/work-orders/${wo.id}`}><button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1">Detail <ExternalLink size={12}/></button></Link>
                          <button className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition">Selesai</button>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="p-4 border-t border-slate-100 bg-white flex justify-end"><button onClick={() => setShowAllWOModal(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-900 transition">Tutup</button></div>
           </div>
        </div>
      )}

      {/* FLOATING INBOX (TETAP ADA) */}
      <button onClick={() => setShowInbox(true)} className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl shadow-blue-500/40 transition-transform active:scale-90 flex items-center justify-center group">
        <ListTodo size={28} />
        {myTasks.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-50 animate-bounce">{myTasks.length}</span>}
      </button>

      {/* INBOX MODAL */}
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Inbox className="text-blue-600" /> Inbox Tugas</h2><p className="text-xs text-slate-500 mt-1">Tugas Anda.</p></div>
              <button onClick={() => setShowInbox(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {myTasks.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-slate-400"><CheckCircle2 size={64} className="mb-4 text-emerald-100" /><p className="font-bold text-slate-600">Beres!</p></div> : 
                <div className="space-y-3 p-2">{myTasks.map((task) => <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400 shadow-sm"><h3 className="font-bold text-slate-800 text-sm">{task['SUBJECT WO']}</h3><p className="text-xs text-slate-500 italic mt-1">{task.KETERANGAN}</p></div>)}</div>
              }
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
              <span className="text-xs text-slate-400 font-bold">{myTasks.length} Pending Task(s)</span>
              {myTasks.length > 0 && <button onClick={handleDownloadInbox} className="flex items-center gap-2 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"><Download size={16} /> Download .txt</button>}
            </div>
          </div>
        </div>
      )}

      {/* STYLE TOOLTIP HITAM */}
      <style dangerouslySetInnerHTML={{__html: `.apexcharts-tooltip-text, .apexcharts-tooltip-title, .apexcharts-tooltip-text-y-label, .apexcharts-tooltip-text-y-value { color: #0f172a !important; font-family: inherit !important; font-weight: 700 !important; } .apexcharts-tooltip { background: #ffffff !important; border: 1px solid #e2e8f0 !important; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important; }`}} />
    </div>
  );
}

// Komponen StatCard (Kecil)
function StatCard({ title, value, sub, icon, color }: any) {
  const colors: any = { blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', emerald: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${colors[color]}`}>{icon}</div>
      </div>
      <h3 className="text-3xl font-black text-slate-900 mb-1">{value}</h3>
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans animate-pulse">
      <div className="h-12 w-full bg-slate-200 rounded-xl mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl"></div><div className="flex flex-col gap-6"><div className="h-48 bg-slate-200 rounded-2xl"></div><div className="h-64 bg-slate-200 rounded-2xl"></div></div></div>
    </div>
  );
}
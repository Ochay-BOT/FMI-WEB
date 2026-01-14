'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import Link from 'next/link'; 
import { 
  Users, Server, ArrowUpRight, Clock, Activity, Plus,
  Sun, Moon, CalendarDays, Inbox, CheckCircle2, ArrowRight,
  Download, X, ListTodo, BarChart3, TrendingUp, ArrowDownRight, MinusCircle, 
  AlertTriangle, Calendar, ChevronLeft, ChevronRight, ExternalLink, List
} from 'lucide-react';
import { format, getISOWeek } from 'date-fns'; 
import { id as indonesia } from 'date-fns/locale';
import { Role } from '@/lib/permissions';

// Import ini tetap ada jika Anda ingin menggunakan AlertBanner lama, 
// namun di bawah saya sudah sediakan Banner Native yang lebih stabil.
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
  
  const [stats, setStats] = useState({
    totalClient: 0, activeClient: 0,
    totalVlanUsed: 0, totalVlanFree: 0,
    growthMonth: 0, logsToday: 0,
    woPending: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [chartTab, setChartTab] = useState<'CLIENT' | 'CAPACITY'>('CLIENT');
  const [chartData, setChartData] = useState<any>({ client: [], capacity: [] });
  const [chartSummary, setChartSummary] = useState({ pasang: 0, putus: 0, cuti: 0, upgrade: 0, downgrade: 0 });
  const [pendingWOs, setPendingWOs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [showAllWOModal, setShowAllWOModal] = useState(false);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false); 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const morningSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamA : TEAM_CONFIG.teamB;
  const afternoonSquad = TEAM_CONFIG.isWeekA_Morning ? TEAM_CONFIG.teamB : TEAM_CONFIG.teamA;

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

      if (currentUserName) {
        const { data: tasks } = await supabase.from('Report Bulanan').select('*').eq('NAMA TEAM', currentUserName).not('STATUS', 'in', '("SOLVED","CLOSED")').order('TANGGAL', { ascending: false });
        if (tasks) setMyTasks(tasks);
      }

      // 1. Ambil Statistik Utama (Tabel 1, 11)
      const { count: clientCount } = await supabase.from('Data Client Corporate').select('*', { count: 'exact', head: true });
      const { data: allPending } = await supabase.from('Report Bulanan').select('*').in('STATUS', ['PENDING', 'OPEN', 'PROGRESS', 'ON PROGRESS']).order('id', { ascending: false }).limit(50);
      
      // 2. Ambil Data Chart (Tabel 2-6) - Menggunakan select('*') agar spasi kolom aman
      const tables = ['Berlangganan 2026', 'Berhenti Berlangganan 2026', 'Berhenti Sementara 2026', 'Upgrade 2026', 'Downgrade 2026'];
      const responses = await Promise.all(tables.map(t => supabase.from(t).select('*')));
      
      const groupByMonth = (data: any[]) => {
        const months = new Array(12).fill(0);
        data?.forEach(row => { if (row.TANGGAL) months[new Date(row.TANGGAL).getMonth()]++; });
        return months;
      };
      
      const d = responses.map(r => groupByMonth(r.data || []));

      setChartData({
        client: [{ name: 'Pasang Baru', data: d[0] }, { name: 'Berhenti', data: d[1] }, { name: 'Cuti', data: d[2] }],
        capacity: [{ name: 'Upgrade', data: d[3] }, { name: 'Downgrade', data: d[4] }]
      });

      setChartSummary({
        pasang: d[0].reduce((a, b) => a + b, 0), putus: d[1].reduce((a, b) => a + b, 0), cuti: d[2].reduce((a, b) => a + b, 0),
        upgrade: d[3].reduce((a, b) => a + b, 0), downgrade: d[4].reduce((a, b) => a + b, 0),
      });

      // 3. Log Aktivitas
      const today = new Date().toISOString().slice(0, 10);
      const { data: logs } = await supabase.from('Log_Aktivitas').select('*').order('created_at', { ascending: false }).limit(5);
      const { count: countToday } = await supabase.from('Log_Aktivitas').select('id', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00');

      setStats(prev => ({
        ...prev,
        totalClient: clientCount || 0,
        woPending: allPending?.length || 0,
        growthMonth: d[0][new Date().getMonth()],
        logsToday: countToday || 0
      }));
      setRecentLogs(logs || []);
      if (allPending) setPendingWOs(allPending);

    } catch (err) { console.error("Error Dashboard:", err); } 
    finally { setLoading(false); }
  }

  useEffect(() => { fetchDashboardData(); }, []);

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

  if (loading) return <DashboardSkeleton />;

  const currentBannerWO = pendingWOs.length > 0 ? pendingWOs[currentIndex] : null;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-slate-600 text-sm font-bold">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: indonesia })}</p>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard <span className="text-blue-600">NOC FMI</span> 👋</h1>
        </div>
        <Link href="/work-orders/create">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">
            <Plus size={18} /> Buat WO Baru
          </button>
        </Link>
      </div>

      {/* BANNER WO UTAMA (DI ATAS) */}
      {currentBannerWO && (
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-center group">
          <div className="absolute top-0 bottom-0 left-0 w-2 bg-rose-600"></div>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
               <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 border border-rose-200 w-fit">
                  <AlertTriangle size={12} /> PERHATIAN (WO ACTIVE)
               </span>
               <span className="text-[10px] font-mono text-slate-400">{currentIndex + 1}/{pendingWOs.length}</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 truncate">{currentBannerWO['SUBJECT WO']}</h3>
            <p className="text-xs text-slate-500 italic mt-1">"{currentBannerWO['KETERANGAN'] || '-'}"</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex gap-1">
              <button onClick={() => setCurrentIndex(p => (p - 1 + pendingWOs.length) % pendingWOs.length)} className="p-2 border rounded-lg hover:bg-slate-50 transition-colors"><ChevronLeft size={16}/></button>
              <button onClick={() => setCurrentIndex(p => (p + 1) % pendingWOs.length)} className="p-2 border rounded-lg hover:bg-slate-50 transition-colors"><ChevronRight size={16}/></button>
            </div>
            <button onClick={() => setShowAllWOModal(true)} className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs shadow-md">Lihat Semua</button>
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <StatCard title="Total Client" value={stats.totalClient} sub={`Active: ${stats.activeClient}`} icon={<Users size={24} />} color="blue" />
        <StatCard title="WO Pending" value={stats.woPending} sub="Needs Action" icon={<Activity size={24} />} color="purple" />
        <StatCard title="VLAN Terpakai" value={stats.totalVlanUsed} sub={`Free: ${stats.totalVlanFree}`} icon={<Server size={24} />} color="emerald" />
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
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setChartTab('CLIENT')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'CLIENT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Pelanggan</button>
                    <button onClick={() => setChartTab('CAPACITY')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'CAPACITY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Kapasitas</button>
                </div>
            </div>
            <div className="flex-1 min-h-[280px]">
                <ReactApexChart 
                  options={{
                    chart: { toolbar: { show: false } },
                    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] },
                    colors: chartTab === 'CLIENT' ? ['#10b981', '#ef4444', '#f59e0b'] : ['#3b82f6', '#64748b']
                  }} 
                  series={chartTab === 'CLIENT' ? chartData.client : chartData.capacity} 
                  type="bar" 
                  height={280} 
                />
            </div>
          </div>
        </div>

        {/* JADWAL & LOGS */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-blue-600"/> Jadwal NOC</h3>
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Pagi (08.00 - 16.00)</p>
                <div className="flex gap-2">{morningSquad.map((name, i) => <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded shadow-sm border border-amber-200 flex-1 text-center">{name}</span>)}</div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-700 uppercase mb-2">Siang (14.00 - 22.00)</p>
                <div className="flex gap-2">{afternoonSquad.map((name, i) => <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded shadow-sm border border-indigo-200 flex-1 text-center">{name}</span>)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING INBOX */}
      <button onClick={() => setShowInbox(true)} className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-transform active:scale-90 flex items-center justify-center">
        <ListTodo size={28} />
        {myTasks.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-50 animate-bounce">{myTasks.length}</span>}
      </button>

      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Inbox className="text-blue-600" /> Inbox Tugas</h2>
              <button onClick={() => setShowInbox(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {myTasks.length === 0 ? <p className="text-center text-slate-400 py-10">Beres! Tidak ada tugas.</p> : 
                <div className="space-y-3">{myTasks.map((task) => <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><h3 className="font-bold text-slate-800 text-sm">{task['SUBJECT WO']}</h3><p className="text-xs text-slate-500 mt-1">{task.KETERANGAN}</p></div>)}</div>
              }
            </div>
            <div className="p-4 border-t flex justify-end bg-slate-50 rounded-b-2xl">
              {myTasks.length > 0 && <button onClick={handleDownloadInbox} className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-xs font-bold shadow-sm"><Download size={16} /> Download .txt</button>}
            </div>
          </div>
        </div>
      )}

      {showAllWOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={20} className="text-rose-600"/> Daftar WO Urgent</h3>
                 <button onClick={() => setShowAllWOModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
                 {pendingWOs.map((wo) => (
                    <div key={wo.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                       <div><span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200 uppercase">{wo.STATUS}</span><h4 className="font-bold text-slate-800 text-sm mt-1">{wo['SUBJECT WO']}</h4></div>
                       <Link href={`/work-orders/${wo.id}`}><button className="px-4 py-2 bg-white border text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition">Detail</button></Link>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `.apexcharts-tooltip-text { color: #0f172a !important; font-weight: 700 !important; }`}} />
    </div>
  );
}

function StatCard({ title, value, sub, icon, color }: any) {
  const colors: any = { blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', emerald: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform w-fit mb-4 ${colors[color]}`}>{icon}</div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl"></div><div className="h-64 bg-slate-200 rounded-2xl"></div></div>
    </div>
  );
}
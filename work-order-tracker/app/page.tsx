'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import Link from 'next/link'; 
import { 
  Users, Server, ArrowUpRight, Clock, 
  Sun, Moon, CalendarDays, Inbox, CheckCircle2, ArrowRight,
  Download, X, ListTodo 
} from 'lucide-react';
import { format, getISOWeek } from 'date-fns'; 
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
    growthMonth: 0, logsToday: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [chartSeries, setChartSeries] = useState<any[]>([]);
  
  // STATE INBOX
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false); // <--- State untuk buka/tutup Overlay

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
        const { data: tasks } = await supabase
          .from('Report Bulanan')
          .select('*')
          .eq('NAMA TEAM', currentUserName)
          .not('STATUS', 'in', '("SOLVED","CLOSED")')
          .order('TANGGAL', { ascending: false });
        if (tasks) setMyTasks(tasks);
      }

      // Stats Lainnya
      const { data: clients } = await supabase.from('Data Client Corporate').select('STATUS');
      const totalClient = clients?.length || 0;
      const activeClient = clients?.filter(c => (c.STATUS || '').toLowerCase().includes('active')).length || 0;

      const vlanTables = ['Daftar Vlan 1-1000', 'Daftar Vlan 1000+', 'Daftar Vlan 2000+', 'Daftar Vlan 3000+'];
      const vlanResults = await Promise.all(vlanTables.map(table => supabase.from(table).select('NAME')));
      let vlanUsed = 0, vlanTotal = 0;
      vlanResults.forEach(res => {
        const d = res.data || [];
        vlanTotal += d.length;
        vlanUsed += d.filter(r => r.NAME && r.NAME !== '-' && r.NAME !== 'AVAILABLE').length;
      });

      const { data: pasang } = await supabase.from('Berlangganan 2026').select('TANGGAL');
      const { data: putus } = await supabase.from('Berhenti Berlangganan 2026').select('TANGGAL');
      
      const sPasang = new Array(12).fill(0);
      const sPutus = new Array(12).fill(0);
      pasang?.forEach(r => { if(r.TANGGAL) sPasang[new Date(r.TANGGAL).getMonth()]++; });
      putus?.forEach(r => { if(r.TANGGAL) sPutus[new Date(r.TANGGAL).getMonth()]++; });

      setChartSeries([{ name: 'Berlangganan', data: sPasang }, { name: 'Berhenti Berlangganan', data: sPutus }]);

      const today = new Date().toISOString().slice(0, 10);
      const { data: logs } = await supabase.from('Log_Aktivitas').select('*').order('created_at', { ascending: false }).limit(5);
      const { count: countToday } = await supabase.from('Log_Aktivitas').select('id', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00');

      setStats({
        totalClient, activeClient,
        totalVlanUsed: vlanUsed, totalVlanFree: vlanTotal - vlanUsed,
        growthMonth: sPasang[new Date().getMonth()], logsToday: countToday || 0
      });
      setRecentLogs(logs || []);

    } catch (err) { console.error("Error:", err); } 
    finally { setLoading(false); }
  }

  useEffect(() => { fetchDashboardData(); }, []);

  // --- DOWNLOAD TXT ---
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

  const chartOptions: any = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#10b981', '#ef4444'],
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    legend: { position: 'top', horizontalAlign: 'right' },
    dataLabels: { enabled: false }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans relative">
      
      <AlertBanner />

      {/* STATISTIK UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <StatCard title="Total Client" value={stats.totalClient} sub={`Active: ${stats.activeClient}`} icon={<Users size={24} />} color="blue" />
        <StatCard title="VLAN Usage" value={stats.totalVlanUsed} sub={`Free: ${stats.totalVlanFree}`} icon={<Server size={24} />} color="purple" />
        <StatCard title="New This Month" value={`+${stats.growthMonth}`} sub="Growth Trend" icon={<ArrowUpRight size={24} />} color="emerald" />
        <StatCard title="Logs Today" value={stats.logsToday} sub="System Events" icon={<Clock size={24} />} color="orange" />
      </div>

      {/* CHART & JADWAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg">Client Growth</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            {!loading && <ReactApexChart options={chartOptions} series={chartSeries} type="area" height="100%" />}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600"/> Jadwal Minggu Ini
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

      {/* ======================================================== */}
      {/* FLOATING BUTTON & OVERLAY INBOX  (BAGIAN BARU)          */}
      {/* ======================================================== */}
      
      {/* 1. FLOATING BUTTON (POJOK KANAN BAWAH) */}
      <button 
        onClick={() => setShowInbox(true)}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl shadow-blue-500/40 transition-transform active:scale-90 flex items-center justify-center group"
      >
        <ListTodo size={28} />
        {myTasks.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-50 animate-bounce">
            {myTasks.length}
          </span>
        )}
        {/* Tooltip Hover */}
        <span className="absolute right-full mr-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Tugas Saya ({myTasks.length})
        </span>
      </button>

      {/* 2. OVERLAY MODAL */}
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Inbox className="text-blue-600" /> Inbox Tugas
                </h2>
                <p className="text-xs text-slate-500 mt-1">Daftar WO yang ditugaskan kepada Anda.</p>
              </div>
              <button onClick={() => setShowInbox(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={24} />
              </button>
            </div>

            {/* Modal Content (List) */}
            <div className="flex-1 overflow-y-auto p-2">
              {myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <CheckCircle2 size={64} className="mb-4 text-emerald-100" />
                  <p className="font-bold text-slate-600">Semua Beres!</p>
                  <p className="text-xs">Tidak ada tugas pending saat ini.</p>
                </div>
              ) : (
                <div className="space-y-3 p-2">
                  {myTasks.map((task) => (
                    <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all group relative">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                           <Clock size={10}/> {task.TANGGAL ? format(new Date(task.TANGGAL), 'dd MMM yyyy') : '-'}
                         </span>
                         <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-200">
                            {task.STATUS}
                         </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1 pr-10">{task['SUBJECT WO']}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                        {task.KETERANGAN || 'Tidak ada keterangan tambahan.'}
                      </p>
                      
                      <div className="mt-4 flex justify-end">
                        <Link 
                          href={`/work-orders?search=${task.id}`} 
                          className="bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                          Kerjakan Sekarang <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
              <span className="text-xs text-slate-400 font-bold">{myTasks.length} Pending Task(s)</span>
              {myTasks.length > 0 && (
                <button 
                  onClick={handleDownloadInbox}
                  className="flex items-center gap-2 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Download size={16} /> Download .txt
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Komponen StatCard (Kecil)
function StatCard({ title, value, sub, icon, color }: any) {
  const colors: any = { blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', emerald: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex justify-between items-start z-10 relative">
        <div><p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{title}</p><h3 className="text-3xl font-bold text-slate-800 mt-1 font-mono">{value}</h3><p className="mt-2 text-[11px] font-semibold text-slate-400">{sub}</p></div>
        <div className={`p-3 rounded-lg ${colors[color]} group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full opacity-10 ${colors[color].split(' ')[0]}`}></div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import { 
  Users, Server, ArrowUpRight, Clock, 
  Sun, Moon, CalendarDays 
} from 'lucide-react';
import { format, getISOWeek } from 'date-fns'; 
import { Role } from '@/lib/permissions';

// --- IMPORT KOMPONEN ALERT BARU ---
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
  
  // State Dashboard
  const [stats, setStats] = useState({
    totalClient: 0, 
    activeClient: 0,
    totalVlanUsed: 0, 
    totalVlanFree: 0,
    growthMonth: 0, 
    logsToday: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [chartSeries, setChartSeries] = useState<any[]>([]);
  
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
      // 0. Ambil Data User Role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile) setUserRole(profile.role as Role);
      }

      // 1. Client Stats
      const { data: clients } = await supabase.from('Data Client Corporate').select('STATUS');
      const totalClient = clients?.length || 0;
      const activeClient = clients?.filter(c => (c.STATUS || '').toLowerCase().includes('active')).length || 0;

      // 2. VLAN Stats
      const vlanTables = ['Daftar Vlan 1-1000', 'Daftar Vlan 1000+', 'Daftar Vlan 2000+', 'Daftar Vlan 3000+'];
      const vlanResults = await Promise.all(vlanTables.map(table => supabase.from(table).select('NAME')));
      
      let vlanUsed = 0, vlanTotal = 0;
      vlanResults.forEach(res => {
        const d = res.data || [];
        vlanTotal += d.length;
        vlanUsed += d.filter(r => r.NAME && r.NAME !== '-' && r.NAME !== 'AVAILABLE').length;
      });

      // 3. Chart Growth & Pasang Baru
      const { data: pasang } = await supabase.from('Berlangganan 2026').select('TANGGAL');
      const { data: putus } = await supabase.from('Berhenti Berlangganan 2026').select('TANGGAL');
      
      const sPasang = new Array(12).fill(0);
      const sPutus = new Array(12).fill(0);
      pasang?.forEach(r => { if(r.TANGGAL) sPasang[new Date(r.TANGGAL).getMonth()]++; });
      putus?.forEach(r => { if(r.TANGGAL) sPutus[new Date(r.TANGGAL).getMonth()]++; });

      setChartSeries([
        { name: 'Pasang Baru', data: sPasang }, 
        { name: 'Putus', data: sPutus }
      ]);

      // 4. Logs
      const today = new Date().toISOString().slice(0, 10);
      const { data: logs } = await supabase.from('Log_Aktivitas').select('*').order('created_at', { ascending: false }).limit(5);
      const { count: countToday } = await supabase.from('Log_Aktivitas').select('id', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00');

      setStats({
        totalClient, 
        activeClient,
        totalVlanUsed: vlanUsed, 
        totalVlanFree: vlanTotal - vlanUsed,
        growthMonth: sPasang[new Date().getMonth()], 
        logsToday: countToday || 0
      });
      setRecentLogs(logs || []);

    } catch (err) { 
      console.error("Dashboard Fetch Error:", err); 
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    fetchDashboardData(); 
  }, []);

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
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* Tombol Solved/Cancel ada di dalam komponen ini */}
      <AlertBanner />
      
      {/* --- CONTENT UTAMA --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <StatCard title="Total Client" value={stats.totalClient} sub={`Active: ${stats.activeClient}`} icon={<Users size={24} />} color="blue" />
        <StatCard title="VLAN Usage" value={stats.totalVlanUsed} sub={`Free: ${stats.totalVlanFree}`} icon={<Server size={24} />} color="purple" />
        <StatCard title="New This Month" value={`+${stats.growthMonth}`} sub="Growth Trend" icon={<ArrowUpRight size={24} />} color="emerald" />
        <StatCard title="Logs Today" value={stats.logsToday} sub="System Events" icon={<Clock size={24} />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg">Tren Pertumbuhan 2026</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            {!loading && <ReactApexChart options={chartOptions} series={chartSeries} type="area" height="100%" />}
          </div>
        </div>

        {/* JADWAL & LOGS */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600"/> Jadwal Minggu Ini
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">
                Week {getISOWeek(new Date())}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sun size={16} className="text-amber-500" />
                  <p className="text-xs font-bold text-amber-700 uppercase text-[10px]">Shift Pagi (08.00 - 16.00)</p>
                </div>
                <div className="flex gap-2">
                  {morningSquad.map((name, i) => (
                    <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded shadow-sm border border-amber-200 flex-1 text-center">{name}</span>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <Moon size={16} className="text-indigo-500" />
                  <p className="text-xs font-bold text-indigo-700 uppercase text-[10px]">Shift Siang (14.00 - 22.00)</p>
                </div>
                <div className="flex gap-2">
                  {afternoonSquad.map((name, i) => (
                    <span key={i} className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded shadow-sm border border-indigo-200 flex-1 text-center">{name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Aktivitas Terkini</h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-50">
              {loading ? (
                <div className="p-10 flex justify-center items-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div></div>
              ) : recentLogs.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400 font-medium">Belum ada aktivitas hari ini</p>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 flex gap-3 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                      {log.ACTIVITY?.substring(0,2) || 'SY'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-700">{log.actor}</p>
                      <p className="text-[10px] text-slate-500 truncate leading-relaxed">{log.SUBJECT}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{log.created_at ? format(new Date(log.created_at), 'HH:mm') : '-'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600'
  };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex justify-between items-start z-10 relative">
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-1 font-mono tracking-tight">{value}</h3>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">{sub}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]} group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full opacity-10 ${colors[color].split(' ')[0]}`}></div>
    </div>
  );
}
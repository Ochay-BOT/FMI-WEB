'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  AlertTriangle, ChevronLeft, ChevronRight, 
  Calendar, CheckCircle2, X, XCircle, CheckCircle, Loader2, ShieldAlert,
  Plus, ExternalLink // FIX: Tambahkan Plus & ExternalLink agar tidak crash
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';
import { hasAccess, PERMISSIONS, Role } from '@/lib/permissions';

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // State Waktu & Modal
  const [today, setToday] = useState<Date | null>(null); // FIX: Mencegah hydration mismatch
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<Record<number, string>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // --- HELPER: EKSTRAK TANGGAL ---
  const extractDateFromText = (text: string, defaultDate: string) => {
    if (!text) return new Date(defaultDate);
    const regex = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[a-z]*\s+(\d{4})/i;
    const match = text.match(regex);

    if (match) {
      const day = parseInt(match[1]);
      const monthStr = match[2].toLowerCase();
      const year = parseInt(match[3]);
      const monthMap: Record<string, number> = {
        januari: 0, jan: 0, februari: 1, feb: 1, maret: 2, mar: 2,
        april: 3, apr: 3, mei: 4, juni: 5, jun: 5, juli: 6, jul: 6,
        agustus: 7, agu: 7, september: 8, sep: 8, oktober: 9, okt: 9,
        november: 10, nov: 10, desember: 11, des: 11
      };
      if (monthMap.hasOwnProperty(monthStr)) {
        return new Date(year, monthMap[monthStr], day);
      }
    }
    return new Date(defaultDate);
  };

  // --- FETCH DATA ---
  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role as Role);
      }

      // Ambil WO Pending (Tabel No 1)
      const { data: woData } = await supabase
        .from('Report Bulanan')
        .select('*')
        .in('STATUS', ['PENDING', 'PROGRESS', 'ON PROGRESS', 'OPEN'])
        .order('id', { ascending: false });

      if (woData) setAlerts(woData);

      const { data: teamData } = await supabase.from('Index').select('TEAM').not('TEAM', 'is', null);
      if (teamData) {
        const unique = Array.from(new Set(teamData.map((t: any) => t.TEAM)));
        setTeamList(unique as string[]);
      }
    } catch (err) {
      console.error("Error AlertBanner:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setToday(new Date()); // Inisialisasi waktu hanya di client side
    fetchData();
  }, []);

  // --- UPDATE STATUS ---
  const handleUpdateStatus = async (id: number, actionType: string) => {
    if (!hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION)) {
      alert("Izin ditolak.");
      return;
    }

    const teamName = selectedTeams[id];
    if (actionType === 'SOLVED' && !teamName) {
      alert('Pilih Team dulu!');
      return;
    }

    setProcessingId(id);
    const todayDate = new Date().toISOString().split('T')[0];
    
    const payload = {
      'STATUS': actionType,
      'KETERANGAN': actionType === 'SOLVED' ? 'DONE' : 'CANCELLED BY SYSTEM',
      'SELESAI ACTION': todayDate,
      'NAMA TEAM': teamName || 'System'
    };

    const { error } = await supabase.from('Report Bulanan').update(payload).eq('id', id);

    if (error) {
      alert('Gagal: ' + error.message);
    } else {
      setAlerts(prev => prev.filter(item => item.id !== id));
      if (alerts.length <= 1) setIsModalOpen(false);
    }
    setProcessingId(null);
  };

  // --- AUTO SLIDE ---
  useEffect(() => {
    if (alerts.length === 0 || isModalOpen) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [alerts.length, isModalOpen]);

  if (loading) return <div className="h-28 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse mb-8"></div>;

  if (alerts.length === 0) {
    return (
      <div className="bg-white border border-emerald-100 p-6 rounded-xl shadow-sm mb-8 flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        <div className="flex items-center gap-4">
           <div className="bg-emerald-50 p-3 rounded-full text-emerald-600"><CheckCircle2 size={32} /></div>
           <div><h1 className="text-xl font-bold text-slate-800">Command Center</h1><p className="text-sm text-slate-500">Semua pekerjaan terselesaikan.</p></div>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm">STATUS: AMAN</div>
      </div>
    );
  }

  const item = alerts[currentIndex];
  // Safe Date Logic
  const targetDate = extractDateFromText(item['KETERANGAN'], item['TANGGAL']);
  const diffDays = today ? differenceInDays(today, targetDate) : 0; 
  
  let dateColor = 'text-slate-600 bg-slate-100';
  let diffText = 'Hari ini';
  if (diffDays > 0) { dateColor = 'text-rose-700 bg-rose-50 border-rose-100'; diffText = `Lewat ${diffDays} hari`; }
  else if (diffDays < 0) { dateColor = 'text-blue-700 bg-blue-50 border-blue-100'; diffText = `${Math.abs(diffDays)} hari lagi`; }

  const status = (item['STATUS'] || '').toUpperCase();
  let statusColor = 'bg-slate-100 text-slate-600';
  if (status.includes('PENDING')) statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
  if (status.includes('PROGRESS')) statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
  if (status.includes('OPEN')) statusColor = 'bg-red-100 text-red-700 border-red-200';

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
        <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 mb-2">
               <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-wider text-xs bg-rose-50 px-2 py-1 rounded border-rose-100">
                  <AlertTriangle size={14} className="animate-pulse" /> Urgent WO
               </div>
               <span className="text-slate-400 text-[10px] font-mono bg-slate-50 px-2 py-1 rounded border-slate-100">{currentIndex + 1} / {alerts.length}</span>
            </div>
            <h3 className="text-slate-800 font-bold text-xl truncate mb-2">{item['SUBJECT WO']}</h3>
            <div className="flex items-center gap-3 text-xs">
               <span className={`px-2 py-1 rounded font-bold uppercase text-[10px] ${statusColor}`}>{item['STATUS']}</span>
               <p className="text-slate-500 italic truncate max-w-lg">"{item['KETERANGAN'] || '-'}"</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
              <div className={`px-4 py-2 rounded-lg flex flex-col items-end ${dateColor}`}>
                 <div className="flex items-center gap-1.5 text-xs font-bold uppercase mb-0.5"><Calendar size={14} />{format(targetDate, 'dd MMM yyyy', { locale: indonesia })}</div>
                 <span className="text-[10px] font-bold opacity-80">{diffText}</span>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setCurrentIndex((p) => (p - 1 + alerts.length) % alerts.length)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg border-slate-200 border"><ChevronLeft size={18} /></button>
                 <button onClick={() => setCurrentIndex((p) => (p + 1) % alerts.length)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg border-slate-200 border"><ChevronRight size={18} /></button>
                 <button onClick={() => setIsModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg">Lihat Semua ({alerts.length})</button>
              </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
              <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="text-rose-500" size={24} /> Antrean Work Order Urgent</h2><p className="text-sm text-slate-500 mt-1">Total {alerts.length} item pending.</p></div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50/30 flex-1">
              <div className="space-y-4">
                {alerts.map((alert) => (
                    <div key={alert.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-start lg:items-center relative">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase bg-slate-100">{alert['STATUS']}</span>
                          <span className="text-xs text-slate-400 font-mono">#{alert.id}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">{alert['SUBJECT WO']}</h3>
                        <p className="text-sm text-slate-500 mt-1 italic">"{alert['KETERANGAN'] || '-'}"</p>
                        
                        {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) && (
                          <div className="mt-3 flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-500">Pilih Team:</span>
                             <select className="text-xs border rounded px-2 py-1 bg-slate-50 text-slate-700"
                               value={selectedTeams[alert.id] || alert['NAMA TEAM'] || ''}
                               onChange={(e) => setSelectedTeams({...selectedTeams, [alert.id]: e.target.value})}
                             >
                               <option value="">- Pilih Eksekutor -</option>
                               {teamList.map((t, i) => <option key={i} value={t}>{t}</option>)}
                             </select>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3 min-w-[200px] w-full lg:w-auto">
                          {/* BUTTON ACTIONS */}
                          <div className="flex gap-2 w-full justify-end">
                             {hasAccess(userRole, PERMISSIONS.OVERVIEW_ACTION) ? (
                               <>
                                 <button onClick={() => handleUpdateStatus(alert.id, 'CANCEL')} disabled={processingId === alert.id} className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded hover:bg-rose-100 border border-rose-200 transition-colors">
                                   {processingId === alert.id ? <Loader2 size={14} className="animate-spin"/> : <XCircle size={14} />} Cancel
                                 </button>
                                 <button onClick={() => handleUpdateStatus(alert.id, 'SOLVED')} disabled={processingId === alert.id} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded hover:bg-emerald-100 border border-emerald-200 transition-colors">
                                   {processingId === alert.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14} />} Selesai
                                 </button>
                               </>
                             ) : (
                               <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded uppercase border italic"><ShieldAlert size={12} /> View Only</div>
                             )}
                          </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-white border-t flex justify-between items-center">
              {/* TOMBOL PENYEBAB CRASH SUDAH DIPERBAIKI IMPORT-NYA */}
              <Link href="/work-orders/create">
                 <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700">
                    <Plus size={18} /> Buat WO Baru
                 </button>
              </Link>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-sm">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
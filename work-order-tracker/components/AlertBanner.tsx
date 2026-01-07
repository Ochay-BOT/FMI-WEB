'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  AlertTriangle, ChevronLeft, ChevronRight, 
  Calendar, CheckCircle2, X, EyeOff, XCircle, CheckCircle, Loader2 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';

export default function AlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [teamList, setTeamList] = useState([]); // State daftar team dari DB
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal & Processing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null); // ID item yang sedang diproses
  const [selectedTeams, setSelectedTeams] = useState({}); // Menyimpan pilihan team per item

  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

  // --- HELPER: EKSTRAK TANGGAL ---
  const extractDateFromText = (text, defaultDate) => {
    if (!text) return new Date(defaultDate);
    const regex = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[a-z]*\s+(\d{4})/i;
    const match = text.match(regex);

    if (match) {
      const day = parseInt(match[1]);
      const monthStr = match[2].toLowerCase();
      const year = parseInt(match[3]);
      const monthMap = {
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

  // --- 1. FETCH DATA (WO & TEAM) ---
  async function fetchData() {
    // A. Fetch WO Pending
    const { data: woData } = await supabase
      .from('Report Bulanan')
      .select('*')
      .in('STATUS', ['PENDING', 'PROGRESS', 'ON PROGRESS', 'OPEN'])
      .order('id', { ascending: false });

    if (woData) setAlerts(woData);

    // B. Fetch Team List dari Table Index
    const { data: teamData } = await supabase
      .from('Index')
      .select('TEAM')
      .not('TEAM', 'is', null);

    if (teamData) {
      const unique = [...new Set(teamData.map(t => t.TEAM))];
      setTeamList(unique);
    }
    
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // --- 2. LOGIC UPDATE STATUS (SELESAI / CANCEL) ---
  const handleUpdateStatus = async (id, actionType) => {
    // Validasi Team (Wajib pilih team jika klik Selesai)
    const teamName = selectedTeams[id];
    
    if (actionType === 'SOLVED' && !teamName) {
      alert('Mohon pilih Team Eksekutor terlebih dahulu!');
      return;
    }

    setProcessingId(id); // Mulai loading di tombol

    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const payload = {
      'STATUS': actionType, // SOLVED atau CANCEL
      'KETERANGAN': actionType === 'SOLVED' ? 'DONE' : 'CANCELLED BY SYSTEM',
      'SELESAI ACTION': todayDate,
      'NAMA TEAM': teamName || 'System' // Default system jika cancel tanpa team
    };

    const { error } = await supabase
      .from('Report Bulanan')
      .update(payload)
      .eq('id', id);

    if (error) {
      alert('Gagal update: ' + error.message);
    } else {
      // Refresh Data Lokal (Hapus item dari list alert)
      setAlerts(prev => prev.filter(item => item.id !== id));
      
      // Jika list habis, tutup modal
      if (alerts.length <= 1) setIsModalOpen(false);
    }
    setProcessingId(null);
  };

  // Helper untuk handle perubahan dropdown team per item
  const handleTeamChange = (id, value) => {
    setSelectedTeams(prev => ({ ...prev, [id]: value }));
  };

  // --- 3. AUTO SLIDE ---
  useEffect(() => {
    if (alerts.length === 0 || isModalOpen) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [alerts.length, isModalOpen]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % alerts.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + alerts.length) % alerts.length);

  // --- RENDER UTAMA ---
  if (loading) return <div className="h-28 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse mb-8"></div>;

  // JIKA AMAN (KOSONG)
  if (alerts.length === 0) {
    return (
      <div className="bg-white border border-emerald-100 p-6 rounded-xl shadow-sm mb-8 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        <div className="flex items-center gap-4 z-10">
           <div className="bg-emerald-50 p-3 rounded-full text-emerald-600"><CheckCircle2 size={32} /></div>
           <div>
             <h1 className="text-xl font-bold text-slate-800">NOC Command Center</h1>
             <p className="text-sm text-slate-500">System Normal. Semua pekerjaan terselesaikan.</p>
           </div>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm border border-emerald-100 shadow-sm">STATUS: AMAN</div>
      </div>
    );
  }

  const item = alerts[currentIndex];
  const targetDate = extractDateFromText(item['KETERANGAN'], item['TANGGAL']);
  const today = new Date();
  const diffDays = differenceInDays(today, targetDate); 
  
  let dateColor = 'text-slate-600 bg-slate-100';
  let diffText = 'Hari ini';
  let statusColor = 'bg-slate-100 text-slate-600';

  if (diffDays > 0) { dateColor = 'text-rose-700 bg-rose-50 border border-rose-100'; diffText = `Lewat ${diffDays} hari`; }
  else if (diffDays < 0) { dateColor = 'text-blue-700 bg-blue-50 border border-blue-100'; diffText = `${Math.abs(diffDays)} hari lagi`; }

  const status = (item['STATUS'] || '').toUpperCase();
  if (status.includes('PENDING')) statusColor = 'bg-amber-100 text-amber-700 border border-amber-200';
  if (status.includes('PROGRESS')) statusColor = 'bg-blue-100 text-blue-700 border border-blue-200';
  if (status.includes('OPEN')) statusColor = 'bg-red-100 text-red-700 border border-red-200';

  return (
    <>
      {/* --- BANNER DEPAN (SLIDER) --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
        <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 mb-2">
               <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-wider text-xs bg-rose-50 px-2 py-1 rounded border border-rose-100">
                  <AlertTriangle size={14} className="animate-pulse" /> Perhatian (WO Active)
               </div>
               <span className="text-slate-400 text-[10px] font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  {currentIndex + 1} / {alerts.length}
               </span>
            </div>
            <h3 className="text-slate-800 font-bold text-xl truncate leading-tight tracking-tight mb-2" title={item['SUBJECT WO']}>{item['SUBJECT WO'] || 'Tanpa Judul'}</h3>
            <div className="flex items-center gap-3 text-xs w-full">
               <span className={`px-2 py-1 rounded font-bold uppercase text-[10px] shadow-sm ${statusColor}`}>{item['STATUS']}</span>
               <p className="text-slate-500 italic truncate max-w-lg">"{item['KETERANGAN'] || 'Keterangan kosong'}"</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end">
             <div className={`px-4 py-2 rounded-lg flex flex-col items-end ${dateColor} min-w-[120px]`}>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase mb-0.5"><Calendar size={14} />{format(targetDate, 'dd MMM yyyy', { locale: indonesia })}</div>
                <span className="text-[10px] font-bold opacity-80">{diffText}</span>
             </div>
             <div className="flex gap-2">
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <button onClick={prevSlide} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft size={18} /></button>
                    <button onClick={nextSlide} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded shadow-sm transition-all"><ChevronRight size={18} /></button>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-rose-200 transition-all flex items-center gap-2 whitespace-nowrap">
                  Lihat Semua ({alerts.length})
                </button>
             </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-rose-500 transition-all duration-500 ease-out" style={{ width: `${((currentIndex + 1) / alerts.length) * 100}%` }}></div>
      </div>

      {/* --- MODAL DAFTAR LENGKAP (POPUP) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all">
          <div className="bg-white w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="text-rose-500" size={24} /> Daftar Peringatan Jadwal Eksekusi</h2>
                <p className="text-sm text-slate-500 mt-1">Total {alerts.length} Work Order pending. Silakan update status jika sudah selesai.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50/30 flex-1">
              <div className="space-y-4">
                {alerts.map((alert) => {
                  const aDate = extractDateFromText(alert['KETERANGAN'], alert['TANGGAL']);
                  const aDiff = differenceInDays(new Date(), aDate);
                  
                  let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                  let statusText = 'Hari ini';
                  if (aDiff > 0) { badgeClass = 'bg-rose-50 text-rose-700 border-rose-200'; statusText = `Lewat ${aDiff} hari`; }
                  else if (aDiff < 0) { badgeClass = 'bg-blue-50 text-blue-700 border-blue-200'; statusText = `${Math.abs(aDiff)} hari lagi`; }

                  let stColor = 'bg-slate-100 text-slate-600';
                  const st = (alert['STATUS'] || '').toUpperCase();
                  if(st.includes('PROGRESS')) stColor = 'bg-blue-100 text-blue-700 border-blue-200';
                  if(st.includes('PENDING')) stColor = 'bg-amber-100 text-amber-700 border-amber-200';

                  const isProcessing = processingId === alert.id;

                  return (
                    <div key={alert.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                      
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${stColor}`}>{alert['STATUS']}</span>
                          <span className="text-xs text-slate-400 font-mono">#{alert.id}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg leading-snug">{alert['SUBJECT WO']}</h3>
                        <p className="text-sm text-slate-500 mt-1 italic">"{alert['KETERANGAN'] || '-'}"</p>
                        
                        {/* PILIH TEAM (DROPDOWN) */}
                        <div className="mt-3 flex items-center gap-2">
                           <span className="text-xs font-bold text-slate-500">Eksekutor:</span>
                           <select 
                             className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none w-48 text-slate-700"
                             value={selectedTeams[alert.id] || alert['NAMA TEAM'] || ''}
                             onChange={(e) => handleTeamChange(alert.id, e.target.value)}
                           >
                             <option value="">- Pilih Team -</option>
                             {teamList.map((t, i) => <option key={i} value={t}>{t}</option>)}
                           </select>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 min-w-[200px] w-full lg:w-auto">
                         <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border w-full justify-end ${badgeClass}`}>
                            <Calendar size={16} />
                            <div className="text-right leading-tight">
                              <p className="text-xs font-bold uppercase">{format(aDate, 'dd MMMM yyyy', { locale: indonesia })}</p>
                              <p className="text-[10px] opacity-80">{statusText}</p>
                            </div>
                         </div>

                         {/* ACTION BUTTONS */}
                         <div className="flex gap-2 w-full justify-end">
                            <button 
                              onClick={() => handleUpdateStatus(alert.id, 'CANCEL')}
                              disabled={isProcessing}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                            >
                              {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <XCircle size={14} />} Cancel
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(alert.id, 'SOLVED')}
                              disabled={isProcessing}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                            >
                              {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14} />} Selesai
                            </button>
                         </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end">
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg">Tutup Daftar</button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
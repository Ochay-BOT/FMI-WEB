'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Bell, AlertTriangle, X, ExternalLink, RefreshCw, CheckCircle, Calendar, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const checkMissingData = async () => {
    setLoading(true);
    const missing: any[] = [];

    try {
      // 1. Ambil WO yang sudah SOLVED (Tabel 1)
      const { data: solvedWO } = await supabase
        .from('Report Bulanan')
        .select('*')
        .eq('STATUS', 'SOLVED');

      if (!solvedWO || solvedWO.length === 0) {
        setMissingItems([]);
        setLoading(false);
        return;
      }

      // 2. Definisi Aturan Sesuai Gambar Revisi
      const rules = [
        {
          keyword: 'Pelurusan VLAN',
          targetTable: 'Berlangganan 2026',
          targetCol: 'SUBJECT BERLANGGANAN', // Tabel 2
          label: 'Pelanggan Baru',
          color: 'blue'
        },
        {
          keyword: 'Berhenti Berlangganan',
          targetTable: 'Berhenti Berlangganan 2026',
          targetCol: 'SUBJECT BERHENTI BERLANGGANAN', // Tabel 3
          label: 'Berhenti',
          color: 'red'
        },
        {
          keyword: 'Berhenti Sementara',
          targetTable: 'Berhenti Sementara 2026',
          targetCol: 'SUBJECT BERHENTI SEMENTARA', // Tabel 4
          label: 'Cuti',
          color: 'orange'
        },
        {
          keyword: ['Upgrade Bandwith', 'Upgrade Kapasitas'],
          targetTable: 'Upgrade 2026',
          targetCol: 'SUBJECT UPGRADE', // Tabel 5
          label: 'Upgrade',
          color: 'emerald'
        },
        {
          keyword: ['Downgrade Bandwith', 'Downgrade Kapasitas'],
          targetTable: 'Downgrade 2026',
          targetCol: 'SUBJECT DOWNGRADE', // Tabel 6
          label: 'Downgrade',
          color: 'yellow'
        }
      ];

      for (const rule of rules) {
        const candidates = solvedWO.filter((wo) => {
          const subject = (wo['SUBJECT WO'] || '').toLowerCase();
          if (Array.isArray(rule.keyword)) {
            return rule.keyword.some(k => subject.includes(k.toLowerCase()));
          }
          return subject.includes(rule.keyword.toLowerCase());
        });

        if (candidates.length > 0) {
          // Ambil data pembanding
          const { data: existingData, error } = await supabase
            .from(rule.targetTable)
            .select('*'); // Gunakan select * untuk menghindari error 400 jika salah ketik kolom

          if (error) {
            console.error(`Error fetch ${rule.targetTable}:`, error.message);
            continue;
          }

          const existingSubjects = new Set(
            existingData?.map((item) => (item[rule.targetCol] || '').toLowerCase().trim()) || []
          );

          candidates.forEach((wo) => {
            const woSubjectClean = (wo['SUBJECT WO'] || '').toLowerCase().trim();
            if (!existingSubjects.has(woSubjectClean)) {
              missing.push({
                id: wo.id,
                date: wo['TANGGAL'],
                subject: wo['SUBJECT WO'],
                type: rule.label,
                targetTable: rule.targetTable,
                color: rule.color
              });
            }
          });
        }
      }

      setMissingItems(missing);
    } catch (err) {
      console.error("Critical Notification Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkMissingData();
    const interval = setInterval(checkMissingData, 300000); 
    return () => clearInterval(interval);
  }, []);

  const handleFixData = (subject: string) => {
    const encodedSubject = encodeURIComponent(subject);
    router.push(`/tracker/create?subject=${encodedSubject}`);
    setIsOpen(false);
  };

  const getCardTheme = (color: string) => {
    const themes: any = {
      blue: { border: 'border-blue-500', badge: 'bg-blue-50 text-blue-600 border-blue-200', btn: 'bg-blue-600 hover:bg-blue-700' },
      red: { border: 'border-red-500', badge: 'bg-red-50 text-red-600 border-red-200', btn: 'bg-red-600 hover:bg-red-700' },
      orange: { border: 'border-orange-500', badge: 'bg-orange-50 text-orange-600 border-orange-200', btn: 'bg-orange-600 hover:bg-orange-700' },
      emerald: { border: 'border-emerald-500', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700' },
      yellow: { border: 'border-yellow-500', badge: 'bg-yellow-50 text-yellow-600 border-yellow-200', btn: 'bg-yellow-600 hover:bg-yellow-700' },
    };
    return themes[color] || themes.blue;
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 active:scale-95 duration-200 mr-4 group"
      >
        <Bell size={24} className="group-hover:text-slate-800 transition-colors" />
        {!loading && missingItems.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-red-600 ring-2 ring-red-600 animate-pulse shadow-sm">
            {missingItems.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-50 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] border border-slate-700">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 shadow-inner">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Missing Data</h2>
                  <p className="text-slate-400 text-xs mt-0.5"><span className="text-red-400 font-bold">{missingItems.length} Work Order</span> Belum Masuk Weekly.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => checkMissingData()} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-all border border-slate-700">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-slate-100 scroll-smooth">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[300px]">
                  <RefreshCw size={40} className="animate-spin text-blue-500 opacity-80" />
                  <p className="font-medium text-slate-500 text-sm">Sedang memindai database...</p>
                </div>
              ) : missingItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-6 min-h-[300px]">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                    <CheckCircle size={40} className="text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-800">Semua Data Sinkron!</h3>
                    <p className="text-slate-500 mt-1 text-sm">Tidak ada WO Solved yang perlu tindakan.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {missingItems.map((item, idx) => {
                    const theme = getCardTheme(item.color);
                    return (
                      <div key={idx} className={`bg-white rounded-lg p-0 shadow-sm hover:shadow-md transition-all border-l-[4px] ${theme.border} border-t border-r border-b border-slate-200 flex flex-col items-stretch group overflow-hidden`}>
                        <div className="p-4 flex flex-row items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                <Calendar size={12} />
                                <span>{item.date}</span>
                              </div>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${theme.badge}`}>{item.type}</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-800 leading-snug mb-2 group-hover:text-blue-700 transition-colors">{item.subject}</h3>
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-400 flex items-center gap-1"><Info size={12} /> Missing di:</span>
                              <span className="font-mono font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{item.targetTable}</span>
                            </div>
                          </div>
                          <div className="shrink-0 self-center">
                            <button onClick={() => handleFixData(item.subject)} className={`px-4 py-2 rounded-md font-bold text-white text-xs shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 ${theme.btn}`}>
                              <ExternalLink size={14} />
                              Input
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
              <span>Menampilkan {missingItems.length} item pending</span>
              <button onClick={() => setIsOpen(false)} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors">Tutup (Esc)</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
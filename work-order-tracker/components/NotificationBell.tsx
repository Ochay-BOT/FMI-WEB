'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Bell, AlertTriangle, X, ExternalLink, RefreshCw, CheckCircle, Calendar, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false); //
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => {
    setMounted(true); // Memastikan komponen sudah di-mount di client side
    checkMissingData();
    const interval = setInterval(checkMissingData, 300000); 
    return () => clearInterval(interval);
  }, []);

  const checkMissingData = async () => {
    setLoading(true);
    const missing: any[] = [];

    try {
      const { data: solvedWO } = await supabase
        .from('Report Bulanan')
        .select('*')
        .eq('STATUS', 'SOLVED');

      if (!solvedWO || solvedWO.length === 0) {
        setMissingItems([]);
        setLoading(false);
        return;
      }

      const rules = [
        { keyword: 'Pelurusan VLAN', targetTable: 'Berlangganan 2026', targetCol: 'SUBJECT BERLANGGANAN', label: 'Pelanggan Baru', color: 'blue' },
        { keyword: 'Berhenti Berlangganan', targetTable: 'Berhenti Berlangganan 2026', targetCol: 'SUBJECT BERHENTI BERLANGGANAN', label: 'Berhenti', color: 'red' },
        { keyword: 'Berhenti Sementara', targetTable: 'Berhenti Sementara 2026', targetCol: 'SUBJECT BERHENTI SEMENTARA', label: 'Cuti', color: 'orange' },
        { keyword: ['Upgrade Bandwith', 'Upgrade Kapasitas'], targetTable: 'Upgrade 2026', targetCol: 'SUBJECT UPGRADE', label: 'Upgrade', color: 'emerald' },
        { keyword: ['Downgrade Bandwith', 'Downgrade Kapasitas'], targetTable: 'Downgrade 2026', targetCol: 'SUBJECT DOWNGRADE', label: 'Downgrade', color: 'yellow' }
      ];

      for (const rule of rules) {
        const candidates = solvedWO.filter((wo) => {
          const subject = (wo['SUBJECT WO'] || '').toLowerCase();
          return Array.isArray(rule.keyword) ? rule.keyword.some(k => subject.includes(k.toLowerCase())) : subject.includes(rule.keyword.toLowerCase());
        });

        if (candidates.length > 0) {
          const { data: existingData } = await supabase.from(rule.targetTable).select('*');
          const existingSubjects = new Set(existingData?.map((item) => (item[rule.targetCol] || '').toLowerCase().trim()) || []);

          candidates.forEach((wo) => {
            const woSubjectClean = (wo['SUBJECT WO'] || '').toLowerCase().trim();
            if (!existingSubjects.has(woSubjectClean)) {
              missing.push({
                id: wo.id,
                date: wo['TANGGAL'],
                subject: wo['SUBJECT WO'],
                type: rule.label,
                targetTable: rule.targetTable,
                themeColor: rule.color
              });
            }
          });
        }
      }
      setMissingItems(missing);
    } catch (err) {
      console.error("Notification Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFixData = (subject: string) => {
    const encodedSubject = encodeURIComponent(subject);
    router.push(`/tracker/create?subject=${encodedSubject}`);
    setIsOpen(false);
  };

  // Border kiri kartu mengikuti kategori
  const getBorderColor = (color: string) => {
    const colors: any = { 
      blue: 'border-blue-500', 
      red: 'border-red-500', 
      orange: 'border-orange-500', 
      emerald: 'border-emerald-500', 
      yellow: 'border-yellow-500' 
    };
    return colors[color] || 'border-slate-300';
  };

  if (!mounted) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 active:scale-95 duration-200 mr-4 group"
      >
        <Bell size={24} />
        {!loading && missingItems.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-red shadow-sm animate-pulse">
            {missingItems.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
            
            {/* MODAL HEADER */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-500" />
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Missing Data Sinkronisasi</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => checkMissingData()} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* NOTIFICATION LIST */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-3">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-400 font-bold italic uppercase tracking-widest">Memindai Database...</div>
              ) : missingItems.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <CheckCircle size={40} className="text-emerald-500" />
                  <p className="font-bold">Database Terintegrasi!</p>
                </div>
              ) : (
                missingItems.map((item, idx) => (
                  <div key={idx} className={`bg-white rounded-xl border-l-4 ${getBorderColor(item.themeColor)} border-t border-r border-b border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          <Calendar size={12} /> {item.date}
                        </span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded border border-blue-100 bg-blue-50 text-blue-600 uppercase tracking-widest">
                          {item.type}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 leading-tight mb-2">{item.subject}</h3>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400 italic font-medium">Missing di tabel:</span>
                        <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{item.targetTable}</span>
                      </div>
                    </div>

                    {/* TOMBOL INPUT: BIRU SOLID TULISAN PUTIH */}
                    <div className="shrink-0">
                      <button 
                        onClick={() => handleFixData(item.subject)} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-200 transition-all active:scale-95 uppercase tracking-wide border-0"
                      >
                        <ExternalLink size={14} />
                        Input
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="bg-white px-6 py-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>{missingItems.length} Work Order Perlu Tindakan</span>
              <button onClick={() => setIsOpen(false)} className="hover:text-slate-800 font-black transition-colors">Tutup (Esc)</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
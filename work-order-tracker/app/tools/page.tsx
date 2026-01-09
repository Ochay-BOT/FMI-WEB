'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Wrench, Calculator, Activity, FileText, Shuffle, 
  Copy, Download, RefreshCcw, Plus, X, CheckCircle, Search, 
  Calendar, Network, Globe, Save, Lock, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';

// Import RBAC Helper
import { PERMISSIONS, hasAccess, Role } from '@/lib/permissions';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const TABS = [
  { id: 'ipcalc', label: 'IP Subnet Calculator', icon: Calculator, desc: 'Hitung subnet mask & range IP' },
  { id: 'speedtest', label: 'Speed Test', icon: Activity, desc: 'Cek koneksi internet server' },
  { id: 'backbone', label: 'Report Generator', icon: FileText, desc: 'Buat laporan teknis otomatis' },
  { id: 'distributor', label: 'WO Distributor', icon: Shuffle, desc: 'Bagi tugas WO ke tim' },
];

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('ipcalc');
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
    async function getRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (data) setUserRole(data.role as Role);
      }
    }
    getRole();
  }, []);

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-blue-600" /> Tools & Utilities
          </h1>
          <p className="text-sm text-slate-500">
            {userRole === 'CS' ? 'Mode View Only (Customer Service)' : 'Kumpulan alat bantu operasional.'}
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          // RBAC Logic: CS can view all, but others are restricted based on PERMISSIONS
          const isDistributor = tab.id === 'distributor';
          const canAccessDistributor = hasAccess(userRole, PERMISSIONS.TOOLS_WO_DISTRIBUTOR_VIEW);
          
          // Disable tab if not Super Dev/Admin/Aktivator (Specifically for WO Distributor)
          const isDisabled = isDistributor && !canAccessDistributor && userRole !== 'CS';

          return (
            <button
              key={tab.id}
              disabled={isDisabled}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden ${
                isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-100' :
                isActive 
                  ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' 
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className={`p-3 rounded-lg w-fit ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                {isDisabled ? <Lock size={24} /> : <Icon size={24} />}
              </div>
              <div>
                <h3 className={`font-bold text-sm ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{tab.label}</h3>
                <p className="text-xs text-slate-400 mt-1">{isDisabled ? 'Akses Terbatas' : tab.desc}</p>
              </div>
              {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>}
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-1">
        {activeTab === 'ipcalc' && <IpCalculator userRole={userRole} />}
        {activeTab === 'speedtest' && <SpeedTest />}
        {activeTab === 'backbone' && <ReportBackbone userRole={userRole} />}
        {activeTab === 'distributor' && <WoDistributor userRole={userRole} />}
      </div>
    </div>
  );
}

// ==========================================
// 1. IP SUBNET CALCULATOR
// ==========================================
function IpCalculator({ userRole }: { userRole: Role | null }) {
  const [ip, setIp] = useState('');
  const [mask, setMask] = useState(24);
  const [result, setResult] = useState<any>(null);
  const isCS = userRole === 'CS';

  const calculate = () => {
    if(!ip) return;
    const parts = ip.split('.');
    if(parts.length !== 4) return alert('Invalid IP');
    const baseIP = parts.slice(0,3).join('.');
    setResult({
      network: `${baseIP}.0`,
      broadcast: `${baseIP}.255`,
      netmask: '255.255.255.0',
      range: `${baseIP}.1 - ${baseIP}.254`,
      hosts: 254,
      class: parseInt(parts[0]) < 128 ? 'A' : parseInt(parts[0]) < 192 ? 'B' : 'C'
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">IP Subnet Calculator</h2>
      </div>
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-2">ALAMAT IP</label>
            <input type="text" value={ip} onChange={(e)=>setIp(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="192.168.1.1" />
          </div>
          <div className="md:col-span-1">
             <label className="block text-xs font-bold text-slate-500 mb-2">CIDR</label>
             <input type="number" value={mask} onChange={(e)=>setMask(Number(e.target.value))} className="w-full px-4 py-2.5 border rounded-lg text-center outline-none" />
          </div>
        </div>
        <button onClick={calculate} className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">Hitung</button>
      </div>
      {result && (
        <div className="bg-white border rounded-xl overflow-hidden divide-y">
          <ResultRow label="Network" value={result.network} />
          <ResultRow label="Host Range" value={result.range} />
        </div>
      )}
    </div>
  );
}

function ResultRow({label, value}: any) {
  return (
    <div className="flex justify-between px-6 py-3">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-slate-800 font-mono font-bold">{value}</span>
    </div>
  )
}

// ==========================================
// 2. SPEED TEST (No RBAC needed for viewing)
// ==========================================
function SpeedTest() {
  return (
    <div className="p-6 h-[600px] flex flex-col">
       <iframe src="https://openspeedtest.com/Get-widget.php" className="w-full h-full border-0 rounded-2xl shadow-inner"></iframe>
    </div>
  );
}

// ==========================================
// 3. REPORT BACKBONE (Restrict Download for CS)
// ==========================================
function ReportBackbone({ userRole }: { userRole: Role | null }) {
  const [form, setForm] = useState({ tiket: '', status: 'Solved', subject: '', impact: '', problem: '', action: '', maps: '', rawData: '' });
  const isCS = userRole === 'CS';

  const handleDownload = () => {
    if (isCS) return alert("Customer Service tidak diizinkan mendownload report.");
    const text = `REPORT BACKBONE | ${form.tiket}\nStatus: ${form.status}\nProblem: ${form.problem}`;
    const file = new Blob([text], {type: 'text/plain'});
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = `Report_${form.tiket}.txt`;
    element.click();
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[600px]">
      <div className="flex-1 p-6 border-r space-y-4">
        <h3 className="font-bold border-b pb-2">Input Data</h3>
        <input placeholder="Tiket" className="w-full p-2 border rounded" onChange={(e)=>setForm({...form, tiket: e.target.value})} />
        <textarea placeholder="Problem" className="w-full p-2 border rounded" onChange={(e)=>setForm({...form, problem: e.target.value})} />
      </div>
      <div className="flex-1 p-6 bg-slate-50">
        <button 
          onClick={handleDownload} 
          disabled={isCS}
          className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${isCS ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <Download size={20}/> {isCS ? 'Download Dibatasi' : 'Download Report (.txt)'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 4. WO DISTRIBUTOR (FIXED: COLUMN 'NAMA TEAM')
// ==========================================
function WoDistributor({ userRole }: { userRole: Role | null }) {
  const [woList, setWoList] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]); 
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // Filter Tanggal (Default: Hari Ini)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0,10));

  const canDistribute = hasAccess(userRole, PERMISSIONS.TOOLS_WO_DISTRIBUTOR_ACTION);

  // --- 1. FETCH WO (Updated Column Name) ---
  const fetchWO = async () => {
    setLoading(true);
    
    let query = supabase.from('Report Bulanan').select('*');

    // LOGIC FILTER TANGGAL (PRIORITAS UTAMA)
    if (filterDate) {
      const dateObj = new Date(filterDate);
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      
      // Format: "11 Januari 2026"
      const searchString = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      console.log("Mencari teks:", searchString); 

      // Cari di KETERANGAN
      query = query.ilike('KETERANGAN', `%${searchString}%`);
      
      // NOTE: Saat mencari tanggal spesifik, kita longgarkan filter status agar datanya kelihatan dulu
    } 
    else {
      // Jika TIDAK pilih tanggal (Default), cari yang pending & belum ada tim
      query = query
        .in('STATUS', ['PENDING', 'OPEN', 'PROGRESS', 'ON PROGRESS'])
        .is('NAMA TEAM', null); // <--- PERBAIKAN DISINI (Pakai 'NAMA TEAM')
    }

    const { data, error } = await query.order('id', { ascending: false }).limit(50);
      
    if (error) {
      alert("Gagal ambil data: " + error.message);
    } else {
      setWoList(data || []);
    }
    setLoading(false);
  };

  // --- 2. FETCH TEKNISI ---
  useEffect(() => {
    async function getTechs() {
      if (!canDistribute) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['NOC', 'AKTIVATOR', 'SUPER_DEV']); 
      if (data) setTechnicians(data);
    }
    getTechs();
  }, [canDistribute]);

  const toggleTech = (name: string) => {
    if (selectedTechs.includes(name)) {
      setSelectedTechs(selectedTechs.filter(t => t !== name));
    } else {
      setSelectedTechs([...selectedTechs, name]);
    }
  };

  // --- 3. DISTRIBUTE WO (Updated Column Name) ---
  const distributeWO = async () => {
    if (!canDistribute) return alert("Akses Ditolak.");
    if (selectedTechs.length === 0) return alert("Pilih minimal 1 tim!");
    if (woList.length === 0) return alert("Tidak ada WO.");

    setDistributing(true);

    try {
      const updates = woList.map(async (wo, index) => {
        const assignedTech = selectedTechs[index % selectedTechs.length];
        
        // UPDATE KOLOM 'NAMA TEAM'
        const { error } = await supabase
          .from('Report Bulanan')
          .update({ 
            'NAMA TEAM': assignedTech, // <--- PERBAIKAN DISINI
            'STATUS': 'OPEN' 
          }) 
          .eq('id', wo.id);
          
        if (error) throw error;
      });

      await Promise.all(updates);
      alert(`Sukses distribusikan ${woList.length} WO.`);
      fetchWO(); 
      setSelectedTechs([]); 

    } catch (error: any) {
      alert("Error saving: " + error.message);
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 min-h-[600px]">
       
       {/* LIST WO */}
       <div className="lg:col-span-2 flex flex-col border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="p-4 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-center gap-3">
             <h3 className="font-bold text-sm text-slate-700">WO Pending ({woList.length})</h3>
             <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
                <button onClick={fetchWO} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                   {loading ? 'Loading...' : 'Get Data'}
                </button>
             </div>
          </div>

          <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[400px]">
             {woList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                   <p className="text-xs italic">Tidak ada data ditemukan.</p>
                </div>
             ) : (
                woList.map((wo, idx) => (
                  <div key={idx} className="p-3 border border-slate-200 rounded-lg flex justify-between items-center bg-white hover:bg-slate-50 transition">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[10px] font-mono text-slate-400">
                              {/* Coba tampilkan tanggal dari KETERANGAN atau kolom TANGGAL */}
                              {wo.TANGGAL ? format(new Date(wo.TANGGAL), 'dd/MM/yyyy') : '-'}
                           </span>
                           <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">
                              {wo.STATUS}
                           </span>
                           {/* Tampilkan Nama Team jika sudah ada (Pakai kurung siku karena ada spasi) */}
                           {wo['NAMA TEAM'] && (
                             <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                               {wo['NAMA TEAM']}
                             </span>
                           )}
                        </div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{wo['SUBJECT WO'] || 'No Subject'}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 italic">
                           {wo['KETERANGAN'] || '-'}
                        </p>
                     </div>
                  </div>
                ))
             )}
          </div>
       </div>

       {/* PILIH TIM */}
       <div className="space-y-6">
          <div className="border rounded-xl p-5 bg-white shadow-sm h-full flex flex-col">
             <h3 className="font-bold text-sm text-slate-800 mb-3">Pilih Tim Piket</h3>
             <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-[200px]">
                {technicians.length === 0 ? <p className="text-xs text-slate-400">Loading users...</p> : 
                   technicians.map((tech) => (
                      <label key={tech.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${selectedTechs.includes(tech.full_name) ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-slate-50'}`}>
                         <input type="checkbox" checked={selectedTechs.includes(tech.full_name)} onChange={() => toggleTech(tech.full_name)} className="rounded text-blue-600"/>
                         <div>
                            <p className="text-sm font-bold text-slate-700">{tech.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{tech.role}</p>
                         </div>
                      </label>
                   ))
                }
             </div>
             <div className="mt-4 pt-4 border-t">
               <button onClick={distributeWO} disabled={!canDistribute || selectedTechs.length === 0 || woList.length === 0 || distributing} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
                 {distributing ? 'Membagikan...' : `Distribute (${selectedTechs.length} Tim)`}
               </button>
             </div>
          </div>
       </div>
    </div>
  );
}
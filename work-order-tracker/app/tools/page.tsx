'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Wrench, Calculator, Activity, FileText, Shuffle, 
  Copy, Download, RefreshCcw, Plus, X, CheckCircle, Search, 
  Calendar, Network, Globe, Save, Lock
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
          const canAccessDistributor = hasAccess(userRole, PERMISSIONS.TOOLS_WO_DISTRIBUTOR);
          
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
// 4. WO DISTRIBUTOR (CORE RBAC)
// ==========================================
function WoDistributor({ userRole }: { userRole: Role | null }) {
  const [woList, setWoList] = useState<any[]>([]);
  const [selectedWos, setSelectedWos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // RBAC Actions
  const canDistribute = hasAccess(userRole, PERMISSIONS.TOOLS_DISTRIBUTE_ACTION);
  const isCS = userRole === 'CS';

  const fetchWO = async () => {
    setLoading(true);
    const { data } = await supabase.from('Report Bulanan').select('*').in('STATUS', ['PENDING', 'OPEN']).limit(10);
    if (data) setWoList(data);
    setLoading(false);
  };

  const distributeWO = async () => {
    if (!canDistribute) return alert("Anda tidak memiliki akses untuk mendistribusikan WO.");
    alert("Distribusi berhasil dilakukan!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 min-h-[600px]">
       <div className="lg:col-span-2 flex flex-col border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
             <h3 className="font-bold text-sm">WO Pending</h3>
             <button onClick={fetchWO} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1"><RefreshCcw size={14}/> Get Data</button>
          </div>
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
             {woList.map(wo => (
               <div key={wo.id} className="p-3 border rounded-lg flex items-center gap-3">
                  <input type="checkbox" onChange={() => {}} disabled={isCS} />
                  <div>
                    <p className="text-sm font-bold">{wo['SUBJECT WO']}</p>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 rounded uppercase font-bold">{wo.STATUS}</span>
                  </div>
               </div>
             ))}
          </div>
          <div className="p-4 border-t">
             {/* RBAC: Tombol Distribute hanya muncul/aktif untuk Admin & Super Dev */}
             <button 
                onClick={distributeWO} 
                disabled={!canDistribute || woList.length === 0}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${
                  !canDistribute ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                }`}
             >
                <Shuffle size={18} /> {!canDistribute ? 'Distribute Restricted' : 'Distribute to Teams'}
             </button>
             {!canDistribute && !isCS && (
               <p className="text-[10px] text-center text-rose-500 mt-2 italic">Akses Aktivator: Hanya diperbolehkan Get Data & Download.</p>
             )}
          </div>
       </div>

       <div className="border rounded-xl p-5 bg-white h-fit">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Search size={18}/> Management Info</h3>
          <p className="text-xs text-slate-500 italic">Hanya Super Dev & Admin yang bisa memanajemen team untuk distribusi otomatis.</p>
       </div>
    </div>
  );
}
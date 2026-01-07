'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Wrench, Calculator, Activity, FileText, Shuffle, 
  Copy, Download, RefreshCcw, Plus, X, CheckCircle, Search, 
  Calendar, Network, Globe, Save
} from 'lucide-react';
import { format } from 'date-fns';
import { id as indonesia } from 'date-fns/locale';

// --- SETUP SUPABASE ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// --- MENU TABS ---
const TABS = [
  { id: 'ipcalc', label: 'IP Subnet Calculator', icon: Calculator, desc: 'Hitung subnet mask & range IP' },
  { id: 'speedtest', label: 'Speed Test', icon: Activity, desc: 'Cek koneksi internet server' },
  { id: 'backbone', label: 'Report Generator', icon: FileText, desc: 'Buat laporan teknis otomatis' },
  { id: 'distributor', label: 'WO Distributor', icon: Shuffle, desc: 'Bagi tugas WO ke tim' },
];

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('ipcalc');

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-blue-600" /> Tools & Utilities
          </h1>
          <p className="text-sm text-slate-500">Kumpulan alat bantu operasional untuk efisiensi kerja NOC.</p>
        </div>
      </div>

      {/* NAVIGATION TABS (Style Modern) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden ${
                isActive 
                  ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' 
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className={`p-3 rounded-lg w-fit ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className={`font-bold text-sm ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{tab.label}</h3>
                <p className="text-xs text-slate-400 mt-1">{tab.desc}</p>
              </div>
              {/* Indikator Active */}
              {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>}
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px] p-1">
        {activeTab === 'ipcalc' && <IpCalculator />}
        {activeTab === 'speedtest' && <SpeedTest />}
        {activeTab === 'backbone' && <ReportBackbone />}
        {activeTab === 'distributor' && <WoDistributor />}
      </div>
    </div>
  );
}

// ==========================================
// 1. IP SUBNET CALCULATOR (Clean UI)
// ==========================================
function IpCalculator() {
  const [ip, setIp] = useState('');
  const [mask, setMask] = useState(24);
  const [result, setResult] = useState(null);

  const calculate = () => {
    if(!ip) return;
    try {
      // Simulasi Perhitungan Sederhana (Logic UI)
      const parts = ip.split('.');
      if(parts.length !== 4) throw new Error('Invalid IP');
      
      const baseIP = parts.slice(0,3).join('.');
      setResult({
        network: `${baseIP}.0`,
        broadcast: `${baseIP}.255`,
        netmask: '255.255.255.0',
        range: `${baseIP}.1 - ${baseIP}.254`,
        hosts: 254,
        class: parseInt(parts[0]) < 128 ? 'A' : parseInt(parts[0]) < 192 ? 'B' : 'C'
      });
    } catch (e) {
      alert('Format IP tidak valid! Gunakan format x.x.x.x');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">IP Subnet Calculator</h2>
        <p className="text-slate-500 text-sm">Hitung parameter jaringan IPv4 dengan cepat.</p>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">ALAMAT IP (IPv4)</label>
            <div className="relative">
              <Network className="absolute left-3 top-3 text-slate-400" size={20}/>
              <input 
                type="text" value={ip} onChange={(e)=>setIp(e.target.value)} placeholder="192.168.1.1" 
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
          <div className="md:col-span-1">
             <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">CIDR (/)</label>
             <input 
               type="number" value={mask} onChange={(e)=>setMask(e.target.value)} placeholder="24" 
               className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-center" 
             />
          </div>
        </div>
        <button onClick={calculate} className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
          Hitung Sekarang
        </button>
      </div>

      {result && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
           <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-700">Hasil Perhitungan</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Class {result.class}</span>
           </div>
           <div className="divide-y divide-slate-100">
             <ResultRow label="Network Address" value={result.network} />
             <ResultRow label="Broadcast Address" value={result.broadcast} />
             <ResultRow label="Subnet Mask" value={result.netmask} />
             <ResultRow label="Host Range" value={result.range} />
             <ResultRow label="Usable Hosts" value={result.hosts} />
           </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({label, value}) {
  return (
    <div className="flex justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
      <span className="text-slate-500 text-sm font-medium">{label}</span>
      <span className="text-slate-800 font-mono font-bold select-all">{value}</span>
    </div>
  )
}

// ==========================================
// 2. SPEED TEST (Clean Embed)
// ==========================================
function SpeedTest() {
  return (
    <div className="p-6 h-full min-h-[600px] flex flex-col">
       <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Network Speed Test</h2>
            <p className="text-xs text-slate-500">Powered by OpenSpeedTest™</p>
          </div>
          <button onClick={() => document.getElementById('speedframe').src += ''} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
            <RefreshCcw size={20} />
          </button>
       </div>
       <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner">
         <iframe 
           id="speedframe"
           src="https://openspeedtest.com/Get-widget.php" 
           className="w-full h-full border-0 absolute inset-0"
           title="Speedtest"
         ></iframe>
       </div>
    </div>
  );
}

// ==========================================
// 3. REPORT BACKBONE (Split View)
// ==========================================
function ReportBackbone() {
  const [form, setForm] = useState({
    tiket: '', status: 'Solved', 
    subject: '', impact: '', 
    problem: '', action: '',
    maps: '', rawData: ''
  });

  const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

  const generateText = () => {
    const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: indonesia });
    return `
REPORT SUMMARY BACKBONE | ${today}

Tiket   : ${form.tiket} - ${form.subject}
Impact  : ${form.impact}
Status  : ${form.status}

Problem:
${form.problem}

Action:
${form.action}

Lampiran Data Tagging / Titik Koordinat:
${form.maps}


======================================================
LAMPIRAN DATA PORT [Raw TEXT]
======================================================

${form.rawData}
    `.trim();
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([generateText()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Report_Backbone_${form.tiket || 'Draft'}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[700px]">
      
      {/* FORM INPUT (KIRI) */}
      <div className="flex-1 p-6 border-r border-slate-200 overflow-y-auto space-y-5">
         <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18}/> Input Data Laporan</h3>
            <button onClick={() => setForm({tiket:'', status:'Solved', subject:'', impact:'', problem:'', action:'', maps:'', rawData:''})} className="text-xs text-slate-400 hover:text-rose-500 font-bold">RESET FORM</button>
         </div>
         
         <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Nomor Tiket</label>
               <input name="tiket" value={form.tiket} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:border-blue-500 outline-none" placeholder="Contoh: HT123"/>
            </div>
            <div>
               <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Status Akhir</label>
               <select name="status" value={form.status} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 text-sm bg-white focus:border-blue-500 outline-none">
                 <option>Solved</option><option>Open</option><option>Monitor</option>
               </select>
            </div>
         </div>

         <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Subject / Judul Insiden</label>
            <input name="subject" value={form.subject} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:border-blue-500 outline-none" placeholder="(TROUBLESHOOT) MAJOR ..."/>
         </div>

         <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Impact / Dampak</label>
            <input name="impact" value={form.impact} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:border-blue-500 outline-none" placeholder="Link Down 100G..."/>
         </div>

         <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Problem (Root Cause)</label>
            <textarea name="problem" rows="3" value={form.problem} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:border-blue-500 outline-none" placeholder="Contoh: FO CUT"></textarea>
         </div>

         <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Action Taken</label>
            <textarea name="action" rows="3" value={form.action} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:border-blue-500 outline-none" placeholder="Contoh: Splice Core"></textarea>
         </div>
      </div>

      {/* LAMPIRAN & PREVIEW (KANAN) */}
      <div className="flex-1 p-6 bg-slate-50 flex flex-col space-y-5">
        <h3 className="font-bold text-slate-800 pb-4 border-b border-slate-200 flex items-center gap-2"><Globe size={18}/> Lampiran Teknis</h3>
        
        <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Lampiran Tagging (URL/Koordinat)</label>
            <input name="maps" value={form.maps} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg text-slate-700 font-mono text-xs focus:border-blue-500 outline-none" placeholder="https://maps.google.com/..."/>
         </div>

         <div className="flex-1 flex flex-col">
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Lampiran Raw Data (CLI/Teknis)</label>
            <textarea name="rawData" value={form.rawData} onChange={handleChange} className="flex-1 w-full p-3 border border-slate-300 rounded-lg bg-slate-900 text-green-400 font-mono text-xs focus:border-blue-500 outline-none resize-none" placeholder="Paste log CLI di sini..."></textarea>
         </div>

         <div className="pt-2">
           <button onClick={handleDownload} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
             <Download size={20}/> Generate & Download Report (.txt)
           </button>
         </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. WO DISTRIBUTOR (UI Dashboard Style)
// ==========================================
function WoDistributor() {
  const [woList, setWoList] = useState([]);
  const [selectedWos, setSelectedWos] = useState([]);
  const [teams, setTeams] = useState([]);
  const [newTeam, setNewTeam] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);

  const extractDateFromText = (text) => {
    if (!text) return null;
    const regex = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[a-z]*\s+(\d{4})/i;
    const match = text.match(regex);
    if (match) {
      const day = match[1].padStart(2, '0');
      const monthMap = { januari:'01', jan:'01', februari:'02', feb:'02', maret:'03', mar:'03', april:'04', apr:'04', mei:'05', juni:'06', jun:'06', juli:'07', jul:'07', agustus:'08', agu:'08', september:'09', sep:'09', oktober:'10', okt:'10', november:'11', nov:'11', desember:'12', des:'12' };
      const month = monthMap[match[2].toLowerCase()];
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const fetchWO = async () => {
    setLoading(true);
    let query = supabase.from('Report Bulanan')
      .select('*')
      .in('STATUS', ['PENDING', 'PROGRESS', 'ON PROGRESS', 'OPEN']);
    
    const { data, error } = await query;
    if (data) {
      let filtered = data;
      if (filterDate) {
        filtered = data.filter(item => {
          const dateInText = extractDateFromText(item['KETERANGAN']);
          return dateInText === filterDate;
        });
      }
      setWoList(filtered);
    }
    setLoading(false);
  };

  const fetchTeams = async () => {
      const { data } = await supabase.from('Index').select('TEAM').not('TEAM', 'is', null);
      if(data) {
          const unique = [...new Set(data.map(t => t.TEAM))];
          if(unique.length > 0) setTeams(unique);
      }
  }

  useEffect(() => { fetchTeams(); }, []);

  const toggleSelect = (id) => {
    setSelectedWos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedWos.length === woList.length) setSelectedWos([]);
    else setSelectedWos(woList.map(w => w.id));
  };

  const distributeWO = async () => {
    if (selectedWos.length === 0) return alert('Pilih WO dulu!');
    if (teams.length === 0) return alert('Tidak ada team tersedia!');

    setLoading(true);
    for (let i = 0; i < selectedWos.length; i++) {
      const woId = selectedWos[i];
      const assignedTeam = teams[i % teams.length]; 
      await supabase.from('Report Bulanan').update({ 'NAMA TEAM': assignedTeam }).eq('id', woId);
    }
    alert('Distribusi Selesai!');
    fetchWO();
    setSelectedWos([]);
    setLoading(false);
  };

  const downloadTxt = () => {
      if(woList.length === 0) return alert("Tidak ada data");
      let text = "DAFTAR WO PENDING / PROGRESS\n=================================\n\n";
      woList.forEach((w, i) => {
          text += `${i+1}. [${w.STATUS}] ${w['SUBJECT WO']} - "${w['KETERANGAN'] || '-'}" (Team: ${w['NAMA TEAM'] || 'Belum Ada'})\n`;
      });
      const file = new Blob([text], {type: 'text/plain'});
      const element = document.createElement("a");
      element.href = URL.createObjectURL(file);
      element.download = `List_WO_${filterDate || 'All'}.txt`;
      document.body.appendChild(element);
      element.click();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full min-h-[700px]">
       
       {/* LEFT: WO LIST */}
       <div className="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <div>
                <h3 className="text-slate-800 font-bold text-sm">Daftar WO (Pending & Progress)</h3>
                <p className="text-slate-400 text-xs">Total {woList.length} items</p>
             </div>
             <div className="flex gap-2">
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-white text-slate-700 text-xs px-2 py-1.5 rounded border border-slate-300 outline-none focus:border-blue-500" />
                <button onClick={downloadTxt} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1 transition"><FileText size={14}/> Export TXT</button>
                <button onClick={fetchWO} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1 transition"><RefreshCcw size={14}/> Get Data</button>
             </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
             <div className="flex items-center gap-3 p-3 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase bg-white">
                <input type="checkbox" checked={selectedWos.length === woList.length && woList.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span>Pilih Semua ({selectedWos.length} terpilih)</span>
             </div>

             {loading ? <p className="text-slate-400 text-center p-8 text-sm animate-pulse">Sedang memuat data...</p> : 
               woList.length === 0 ? <p className="text-slate-400 text-center p-12 text-sm italic">Klik "Get Data" untuk memuat WO.</p> :
               woList.map(wo => (
                 <div key={wo.id} onClick={() => toggleSelect(wo.id)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedWos.includes(wo.id) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selectedWos.includes(wo.id)} readOnly className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none" />
                    <div className="overflow-hidden flex-1">
                       <p className="text-slate-800 text-sm font-bold truncate">{wo['SUBJECT WO']}</p>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-bold uppercase">{wo.STATUS}</span>
                          <span className="text-slate-400 text-xs truncate italic">"{wo['KETERANGAN'] || '-'}"</span>
                       </div>
                    </div>
                    {wo['NAMA TEAM'] && <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded uppercase border border-purple-100">{wo['NAMA TEAM']}</span>}
                 </div>
               ))
             }
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-200 bg-white">
             <button onClick={distributeWO} disabled={selectedWos.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition shadow-lg shadow-indigo-500/20">
                <Shuffle size={18} /> Distribute to Teams (Round Robin)
             </button>
          </div>
       </div>

       {/* RIGHT: TEAM MANAGEMENT */}
       <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col shadow-sm h-fit">
          <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2"><Search size={18}/> Manage Teams</h3>
          
          <div className="flex gap-2 mb-4">
             <input type="text" placeholder="Tambah Team Manual..." value={newTeam} onChange={(e)=>setNewTeam(e.target.value)} className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-sm p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
             <button onClick={() => {if(newTeam) { setTeams([...teams, newTeam]); setNewTeam(''); }}} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"><Plus size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
             {teams.map((t, idx) => (
               <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                  <span className="text-slate-700 font-bold text-sm uppercase">{t}</span>
                  <button onClick={() => setTeams(teams.filter(x => x !== t))} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={16}/></button>
               </div>
             ))}
             {teams.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Belum ada team tersedia.</p>}
          </div>
          <p className="text-slate-400 text-[10px] mt-4 italic text-center bg-slate-50 p-2 rounded">
            Note: Menambah team di sini hanya bersifat sementara untuk sesi distribusi ini.
          </p>
       </div>

    </div>
  );
}
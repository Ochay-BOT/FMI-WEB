'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Search, RefreshCcw, Server, Database, Filter, 
  Edit, Save, Trash2, X, AlertCircle, CheckCircle, Router 
} from 'lucide-react';

// Setup Supabase
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

// Daftar Tabel VLAN
const VLAN_TABLES = [
  { name: 'VLAN 1-1000 (Metro)', table: 'Daftar Vlan 1-1000' },
  { name: 'VLAN 1000+ (Corporate)', table: 'Daftar Vlan 1000+' },
  { name: 'VLAN 2000+ (Residential)', table: 'Daftar Vlan 2000+' },
  { name: 'VLAN 3000+ (Special)', table: 'Daftar Vlan 3000+' },
];

export default function VlanPage() {
  const [selectedTable, setSelectedTable] = useState(VLAN_TABLES[0]);
  const [vlanList, setVlanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // State Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVlan, setEditingVlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // State Statistik
  const [stats, setStats] = useState({ total: 0, used: 0, free: 0 });

  // --- 1. FETCH DATA ---
  async function fetchVlan() {
    setLoading(true);
    const { data, error } = await supabase
      .from(selectedTable.table)
      .select('*')
      .order('VLAN', { ascending: true });

    if (error) {
      console.error('Error fetching VLAN:', error);
      // alert('Gagal mengambil data VLAN.'); // Optional alert
    } else {
      setVlanList(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  }

  // Hitung Statistik
  const calculateStats = (data) => {
    const total = data.length;
    const used = data.filter(r => {
      const name = (r.NAME || '').toUpperCase();
      return name && name !== '-' && name !== 'AVAILABLE' && name !== '';
    }).length;
    const free = total - used;
    setStats({ total, used, free });
  };

  useEffect(() => {
    fetchVlan();
  }, [selectedTable]);

  // --- 2. FILTER SEARCH ---
  const filteredVlan = vlanList.filter(item => {
    const s = search.toLowerCase();
    const vlanID = item.VLAN?.toString() || '';
    const name = item.NAME?.toLowerCase() || '';
    const service = item['SERVICE ID']?.toLowerCase() || '';
    return vlanID.includes(s) || name.includes(s) || service.includes(s);
  });

  // --- 3. MODAL HANDLERS ---
  const handleEditClick = (vlanItem) => {
    setEditingVlan({ ...vlanItem }); 
    setIsModalOpen(true);
  };

  const handleModalChange = (e) => {
    setEditingVlan({ ...editingVlan, [e.target.name]: e.target.value });
  };

  // --- 4. SIMPAN PERUBAHAN ---
  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    // Kita gunakan kolom 'VLAN' sebagai acuan update jika 'id' tidak ada
    const matchQuery = editingVlan.id ? { id: editingVlan.id } : { VLAN: editingVlan.VLAN };

    const { error } = await supabase
      .from(selectedTable.table)
      .update({
        'NAME': editingVlan.NAME,
        'SERVICE ID': editingVlan['SERVICE ID'],
        // Near End
        'NE_SWITCH POP': editingVlan['NE_SWITCH POP'],
        'NE_PORT': editingVlan['NE_PORT'],
        'NE_MODE': editingVlan['NE_MODE'],
        // Far End
        'FE_SWITCH POP': editingVlan['FE_SWITCH POP'],
        'FE_PORT': editingVlan['FE_PORT'],
        'FE_MODE': editingVlan['FE_MODE']
      })
      .match(matchQuery); // Menggunakan match agar lebih fleksibel

    if (error) {
      alert('Gagal update: ' + error.message);
    } else {
      setIsModalOpen(false);
      fetchVlan(); 
    }
    setIsSaving(false);
  };

  // --- 5. RESET VLAN ---
  const handleResetVlan = async () => {
    if (!confirm(`Yakin ingin melepas VLAN ${editingVlan.VLAN}?`)) return;

    setIsSaving(true);
    
    const matchQuery = editingVlan.id ? { id: editingVlan.id } : { VLAN: editingVlan.VLAN };

    const { error } = await supabase
      .from(selectedTable.table)
      .update({
        'NAME': 'AVAILABLE',
        'SERVICE ID': '-',
        'NE_SWITCH POP': '-',
        'NE_PORT': '-',
        'NE_MODE': '-',
        'FE_SWITCH POP': '-',
        'FE_PORT': '-',
        'FE_MODE': '-'
      })
      .match(matchQuery);

    if (error) {
      alert('Gagal reset: ' + error.message);
    } else {
      setIsModalOpen(false);
      fetchVlan();
    }
    setIsSaving(false);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="text-blue-600" /> VLAN Master Registry
          </h1>
          <p className="text-sm text-slate-500">Database alokasi VLAN & IP Network</p>
        </div>

        <div className="flex gap-2">
           <div className="relative">
             <select 
              className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-8 rounded-lg leading-tight focus:outline-none focus:border-blue-500 font-medium text-sm"
              value={selectedTable.name}
              onChange={(e) => setSelectedTable(VLAN_TABLES.find(t => t.name === e.target.value))}
             >
               {VLAN_TABLES.map((t, idx) => (
                 <option key={idx} value={t.name}>{t.name}</option>
               ))}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
               <Filter size={14} />
             </div>
           </div>
           <button onClick={fetchVlan} className="p-2 bg-white border rounded-lg hover:bg-slate-50 text-slate-600">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center">
          <div><p className="text-xs font-bold text-slate-500 uppercase">Total VLAN</p><h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3></div>
          <Database className="text-blue-100" size={32} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-rose-500 flex justify-between items-center">
          <div><p className="text-xs font-bold text-slate-500 uppercase">Terpakai (Used)</p><h3 className="text-2xl font-bold text-rose-600">{stats.used}</h3></div>
          <AlertCircle className="text-rose-100" size={32} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500 flex justify-between items-center">
          <div><p className="text-xs font-bold text-slate-500 uppercase">Tersedia (Free)</p><h3 className="text-2xl font-bold text-emerald-600">{stats.free}</h3></div>
          <CheckCircle className="text-emerald-100" size={32} />
        </div>
      </div>

      {/* TABLE SECTION - LEBAR KE SAMPING */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari VLAN ID / Nama Customer..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
          </div>
          <span className="text-xs text-slate-400">Menampilkan {filteredVlan.length} data</span>
        </div>

        {/* OVERFLOW AUTO -> SUPAYA BISA SCROLL SAMPING */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-3 border-b text-center w-24 sticky left-0 bg-slate-100 z-10 shadow-sm">Status</th>
                <th className="px-6 py-3 border-b w-20">VLAN ID</th>
                <th className="px-6 py-3 border-b min-w-[200px]">Customer Name</th>
                <th className="px-6 py-3 border-b">Service ID</th>
                
                {/* NE GROUP */}
                <th className="px-6 py-3 border-b bg-blue-50/50 text-blue-700 min-w-[150px]">NE Switch (POP)</th>
                <th className="px-6 py-3 border-b bg-blue-50/50 text-blue-700">NE Port</th>
                <th className="px-6 py-3 border-b bg-blue-50/50 text-blue-700">NE Mode</th>
                
                {/* FE GROUP */}
                <th className="px-6 py-3 border-b bg-purple-50/50 text-purple-700 min-w-[150px]">FE Switch (CPE)</th>
                <th className="px-6 py-3 border-b bg-purple-50/50 text-purple-700">FE Port</th>
                <th className="px-6 py-3 border-b bg-purple-50/50 text-purple-700">FE Mode</th>
                
                <th className="px-6 py-3 border-b text-center sticky right-0 bg-slate-100 z-10 shadow-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="11" className="p-8 text-center text-slate-500">Memuat data VLAN...</td></tr>
              ) : filteredVlan.length > 0 ? (
                filteredVlan.map((v, index) => {
                  const name = (v.NAME || '').toUpperCase();
                  const isUsed = name && name !== '-' && name !== 'AVAILABLE' && name !== '';
                  
                  // FIX ERROR KEY: Gunakan v.VLAN (pasti ada) atau index sebagai fallback
                  return (
                    <tr key={v.VLAN || index} className={`hover:bg-slate-50 transition-colors ${!isUsed ? 'bg-emerald-50/20' : ''}`}>
                      {/* STATUS (Sticky Left) */}
                      <td className="px-6 py-3 text-center sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {isUsed ? 
                          <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase">USED</span> : 
                          <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">FREE</span>
                        }
                      </td>
                      
                      <td className="px-6 py-3 font-mono font-bold text-blue-700 text-base">{v.VLAN}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">
                        {v.NAME || <span className="text-slate-400 italic">AVAILABLE</span>}
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-xs">{v['SERVICE ID'] || '-'}</td>
                      
                      {/* NE DATA */}
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-blue-50/20">{v['NE_SWITCH POP']}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-blue-50/20">{v['NE_PORT']}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-blue-50/20">{v['NE_MODE']}</td>
                      
                      {/* FE DATA */}
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-purple-50/20">{v['FE_SWITCH POP']}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-purple-50/20">{v['FE_PORT']}</td>
                      <td className="px-6 py-3 text-slate-600 text-xs font-mono bg-purple-50/20">{v['FE_MODE']}</td>
                      
                      {/* ACTION (Sticky Right) */}
                      <td className="px-6 py-3 text-center sticky right-0 bg-white z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <button onClick={() => handleEditClick(v)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Detail">
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="11" className="p-8 text-center text-slate-400">Data tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL EDIT VLAN --- */}
      {isModalOpen && editingVlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Edit size={18} /> Edit VLAN {editingVlan.VLAN}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-700 p-1 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Informasi Layanan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Customer Name</label>
                    <input type="text" name="NAME" value={editingVlan.NAME || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Service ID</label>
                    <input type="text" name="SERVICE ID" value={editingVlan['SERVICE ID'] || ''} onChange={handleModalChange}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                    <Server size={14} className="text-blue-600"/>
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Near End (POP Side)</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Switch Name</label>
                    <input type="text" name="NE_SWITCH POP" value={editingVlan['NE_SWITCH POP'] || ''} onChange={handleModalChange}
                      className="w-full p-2 text-sm border border-slate-300 rounded font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Port</label>
                    <input type="text" name="NE_PORT" value={editingVlan['NE_PORT'] || ''} onChange={handleModalChange}
                      className="w-full p-2 text-sm border border-slate-300 rounded font-mono" />
                  </div>
                   <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mode</label>
                    <input type="text" name="NE_MODE" value={editingVlan['NE_MODE'] || ''} onChange={handleModalChange}
                      className="w-full p-2 text-sm border border-slate-300 rounded font-mono" />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                    <Router size={14} className="text-purple-600"/>
                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider">Far End (CPE Side)</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Device Name</label>
                    <input type="text" name="FE_SWITCH POP" value={editingVlan['FE_SWITCH POP'] || ''} onChange={handleModalChange}
                      className="w-full p-2 text-sm border border-slate-300 rounded font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Port</label>
                    <input type="text" name="FE_PORT" value={editingVlan['FE_PORT'] || ''} onChange={handleModalChange}
                      className="w-full p-2 text-sm border border-slate-300 rounded font-mono" />
                  </div>
                   <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Mode</label>
                    <input type="text" name="FE_MODE" value={editingVlan['FE_MODE'] || ''} onChange={handleModalChange}
                      className="w-full p-2 text-sm border border-slate-300 rounded font-mono" />
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
              <button onClick={handleResetVlan} disabled={isSaving}
                className="text-rose-600 text-sm font-bold hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                <Trash2 size={16} /> Reset / Kosongkan
              </button>
              <div className="flex gap-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Batal</button>
                <button onClick={handleSaveChanges} disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg flex items-center gap-2">
                  {isSaving ? 'Menyimpan...' : <><Save size={18} /> Simpan</>}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
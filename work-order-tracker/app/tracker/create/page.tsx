'use client';

// Wajib biar aman dari static generation error
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react'; 
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Save, ArrowLeft, Loader2, TrendingUp, 
  CheckCircle, UserPlus, List 
} from 'lucide-react';

// 1. IMPORT TOAST & LOGGER
import { toast } from 'sonner';
import { logActivity } from '@/lib/logger';

const TABLE_OPTIONS = [
  { label: 'Pelanggan Baru (Pasang)', value: 'Berlangganan 2026' },
  { label: 'Berhenti Berlangganan', value: 'Berhenti Berlangganan 2026' },
  { label: 'Cuti / Berhenti Sementara', value: 'Berhenti Sementara 2026' },
  { label: 'Upgrade Layanan', value: 'Upgrade 2026' },
  { label: 'Downgrade Layanan', value: 'Downgrade 2026' },
];

// --- BAGIAN 1: LOGIKA UTAMA DIPINDAH KE SINI ---
function CreateTrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectFromWO = searchParams.get('subject') || '';

  const [saving, setSaving] = useState(false);
  const [selectedTable, setSelectedTable] = useState(TABLE_OPTIONS[0].value);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // State Modal
  
  // State untuk Data Dropdown
  const [options, setOptions] = useState({
    bts: [],
    isp: [],
    device: [],
    team: []
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const [formData, setFormData] = useState({
    'TANGGAL': new Date().toISOString().split('T')[0],
    'SUBJECT BERLANGGANAN': subjectFromWO,
    'PROBLEM': 'Nihil', 
    'TEAM': '',
    'STATUS': 'Done',   
    'BTS': '',
    'DEVICE': '',
    'ISP': '',
    'REASON': ''
  });

  // --- FETCH DATA MASTER (Index) ---
  useEffect(() => {
    async function fetchMasterData() {
      const { data, error } = await supabase.from('Index').select('*');
      
      if (!error && data) {
        // Helper untuk ambil Unique Values & Filter Null/Empty
        // @ts-ignore
        const getUnique = (key) => [...new Set(data.map(item => item[key]).filter(x => x))];

        setOptions({
          bts: getUnique('BTS'),
          isp: getUnique('ISP'),
          device: getUnique('DEVICE'),
          team: getUnique('TEAM')
        });
      }
    }
    fetchMasterData();
  }, []);

  // Update subject jika berubah di URL
  useEffect(() => {
    if(subjectFromWO) setFormData(prev => ({ ...prev, 'SUBJECT BERLANGGANAN': subjectFromWO }));
  }, [subjectFromWO]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    
    // VALIDASI
    if (!formData['SUBJECT BERLANGGANAN']) {
      toast.error('Nama Subject / Pelanggan wajib diisi!');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Menyimpan Data Tracker...');

    // --- 1. PERSIAPAN DATA (MAPPING KOLOM OTOMATIS) ---
    const payload: any = { ...formData };

    // TENTUKAN NAMA KOLOM TARGET BERDASARKAN TABEL
    let targetColumnName = 'SUBJECT BERLANGGANAN'; // Default

    if (selectedTable === 'Berhenti Sementara 2026') {
        targetColumnName = 'SUBJECT BERHENTI SEMENTARA';
    } else if (selectedTable === 'Berhenti Berlangganan 2026') {
        targetColumnName = 'SUBJECT BERHENTI BERLANGGANAN';
    } else if (selectedTable === 'Downgrade 2026') {
        targetColumnName = 'SUBJECT DOWNGRADE';
    } else if (selectedTable === 'Upgrade 2026') {
        targetColumnName = 'SUBJECT UPGRADE';
    }

    // JIKA NAMA KOLOM BEDA DENGAN DEFAULT, KITA TUKAR ISINYA
    if (targetColumnName !== 'SUBJECT BERLANGGANAN') {
        payload[targetColumnName] = payload['SUBJECT BERLANGGANAN'];
        delete payload['SUBJECT BERLANGGANAN']; // Hapus key lama
    }

    // Hapus REASON khusus untuk tabel Berlangganan (karena tidak ada kolomnya)
    if (selectedTable === 'Berlangganan 2026') {
        delete payload['REASON'];
    }

    // --- 2. INSERT KE DATABASE ---
    const { error } = await supabase.from(selectedTable).insert([payload]);

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message, { id: toastId });
      setSaving(false);
      return;
    }

    // --- 3. LOG KE TELEGRAM ---
    const { data: { user } } = await supabase.auth.getUser();
    let actorName = 'System';
    if(user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        actorName = profile?.full_name || 'User';
    }

    await logActivity({
        activity: 'Input Tracker',
        subject: `[${selectedTable}] ${formData['SUBJECT BERLANGGANAN']}`,
        actor: actorName
    });

    // --- 4. FLOW LOGIC SETELAH SUKSES ---
    
    // KASUS A: Pelanggan Baru -> Tawarkan Input Data Client
    if (selectedTable === 'Berlangganan 2026') {
        toast.success('Tracker Tersimpan!', { id: toastId });
        setSaving(false);
        setShowSuccessModal(true); // Munculkan Modal
    } 
    // KASUS B: Berhenti Berlangganan/Sementara -> Update Status Client Otomatis
    else if (selectedTable.includes('Berhenti')) {
        const newStatus = selectedTable === 'Berhenti Berlangganan 2026' ? 'Dismantle' : 'Isolir';
        const targetName = formData['SUBJECT BERLANGGANAN'];
        
        // Cari client berdasarkan nama (Fuzzy Search) dan update statusnya
        const { error: updateError } = await supabase.from('Data Client Corporate')
          .update({ 'STATUS': newStatus })
          .ilike('Nama Pelanggan', `%${targetName}%`); 

        if(updateError) {
            toast.warning('Tracker tersimpan, tapi gagal update status client otomatis.', { id: toastId });
        } else {
            toast.success('Tracker & Status Client Diupdate!', { 
                id: toastId,
                description: `Client '${targetName}' kini berstatus ${newStatus}.` 
            });
        }
        
        setTimeout(() => { router.push('/tracker'); router.refresh(); }, 1500);
    } 
    // KASUS C: Default (Upgrade/Downgrade)
    else {
        toast.success('Data Berhasil Disimpan!', { id: toastId });
        setTimeout(() => { router.push('/tracker'); router.refresh(); }, 1000);
    }
  };

  // Navigasi dari Modal
  const goToClientInput = () => {
    const name = encodeURIComponent(formData['SUBJECT BERLANGGANAN']);
    router.push(`/clients/create?name=${name}`);
  };

  const goBackList = () => {
    router.push('/tracker');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start font-sans relative">
      
      {/* --- MODAL KONFIRMASI CUSTOM --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Pelanggan Baru Dicatat!</h2>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Tracker berhasil disimpan. Apakah Anda ingin lanjut mendaftarkan data teknis <strong>{formData['SUBJECT BERLANGGANAN']}</strong> ke Database Client?
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
              <button 
                onClick={goToClientInput}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2"
              >
                <UserPlus size={18} /> Ya, Input Data Client
              </button>
              <button 
                onClick={goBackList}
                className="w-full py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition flex justify-center items-center gap-2"
              >
                <List size={18} /> Tidak, Kembali ke List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FORM UTAMA --- */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        
        <div className="flex items-center gap-4 mb-8 border-b pb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-600" /> Input Tracker Pelanggan
            </h1>
            <p className="text-sm text-slate-500">Pilih kategori transaksi</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
            <label className="block text-sm font-bold text-blue-800 mb-2">Pilih Kategori Transaksi</label>
            <select 
              value={selectedTable} 
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 font-bold bg-white"
            >
              {TABLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal</label>
              <input type="date" name="TANGGAL" value={formData['TANGGAL']} onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
              <input type="text" name="STATUS" value={formData['STATUS']} onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-slate-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Subject / Nama Pelanggan <span className="text-red-500">*</span></label>
            <input type="text" name="SUBJECT BERLANGGANAN" value={formData['SUBJECT BERLANGGANAN']} onChange={handleChange} placeholder="Nama Customer / PT"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium" />
          </div>

          {/* DROP DOWN GROUP 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">BTS</label>
              <select name="BTS" value={formData['BTS']} onChange={handleChange} 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700">
                <option value="">- Pilih BTS -</option>
                {options.bts.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
              <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ISP</label>
              <select name="ISP" value={formData['ISP']} onChange={handleChange} 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700">
                <option value="">- Pilih ISP -</option>
                {options.isp.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          {/* DROP DOWN GROUP 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Device / Perangkat</label>
              <select name="DEVICE" value={formData['DEVICE']} onChange={handleChange} 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700">
                <option value="">- Pilih Device -</option>
                {options.device.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Team Pelaksana</label>
              <select name="TEAM" value={formData['TEAM']} onChange={handleChange} 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700">
                <option value="">- Pilih Team -</option>
                {options.team.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Problem / Catatan</label>
            <textarea name="PROBLEM" rows={2} value={formData['PROBLEM']} onChange={handleChange}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"></textarea>
          </div>

          {selectedTable !== 'Berlangganan 2026' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <label className="block text-sm font-bold text-red-700 mb-1">Alasan (Reason)</label>
                <textarea name="REASON" rows={2} value={formData['REASON']} onChange={handleChange} placeholder="Kenapa berhenti/downgrade?"
                  className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-700"></textarea>
              </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <button type="submit" disabled={saving}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition flex justify-center items-center gap-2 shadow-lg disabled:bg-slate-300">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {saving ? 'Menyimpan...' : 'Simpan Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- BAGIAN 2: EXPORT DEFAULT (PEMBUNGKUS) ---
export default function CreateTrackerPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start font-sans">
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}>
        <CreateTrackerContent />
      </Suspense>
    </div>
  );
}
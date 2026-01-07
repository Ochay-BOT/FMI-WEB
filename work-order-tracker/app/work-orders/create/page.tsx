'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2, ClipboardList } from 'lucide-react';

export default function CreateWOPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [teamList, setTeamList] = useState([]); // State untuk menyimpan daftar team

  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

  const [formData, setFormData] = useState({
    'TANGGAL': new Date().toISOString().split('T')[0], // Default hari ini
    'SUBJECT WO': '',
    'STATUS': 'PROGRESS', // Default awal
    'JENIS WO': 'PERMANEN', // Default awal
    'KETERANGAN': '',
    'SELESAI ACTION': '', // Nanti jadi date picker
    'NAMA TEAM': ''
  });

  // --- 1. FETCH DATA TEAM DARI TABLE 'Index' ---
  useEffect(() => {
    async function fetchTeams() {
      // Ambil kolom TEAM dari tabel Index
      const { data, error } = await supabase
        .from('Index')
        .select('TEAM')
        .not('TEAM', 'is', null); // Pastikan tidak null

      if (!error && data) {
        // Hapus duplikat nama team (Unique)
        const uniqueTeams = [...new Set(data.map(item => item.TEAM))];
        setTeamList(uniqueTeams);
        
        // Set default team ke pilihan pertama jika ada
        if (uniqueTeams.length > 0) {
          setFormData(prev => ({ ...prev, 'NAMA TEAM': uniqueTeams[0] }));
        }
      }
    }
    fetchTeams();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!formData['SUBJECT WO']) {
      alert('Subject WO wajib diisi!');
      setSaving(false);
      return;
    }

    // 2. Simpan ke Database
    const { error } = await supabase
      .from('Report Bulanan')
      .insert([formData]);

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
      setSaving(false);
    } else {
      
      // 3. LOGIC FLOW (Smart Redirect)
      if (formData['STATUS'] === 'SOLVED') {
        const isConfirmed = confirm('Work Order berstatus SOLVED! \nApakah Anda ingin lanjut input data ini ke Tracker Pelanggan?');
        
        if (isConfirmed) {
          const subject = encodeURIComponent(formData['SUBJECT WO']);
          router.push(`/tracker/create?subject=${subject}`);
        } else {
          router.push('/work-orders');
          router.refresh();
        }

      } else {
        alert('Work Order berhasil disimpan!');
        router.push('/work-orders');
        router.refresh();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start font-sans">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        
        <div className="flex items-center gap-4 mb-8 border-b pb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="text-blue-600" /> Buat Work Order Baru
            </h1>
            <p className="text-sm text-slate-500">Input laporan pekerjaan harian / bulanan</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* BARIS 1: TANGGAL & STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal</label>
              <input 
                type="date" 
                name="TANGGAL" 
                value={formData['TANGGAL']} 
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
              <select 
                name="STATUS" 
                value={formData['STATUS']} 
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
              >
                <option value="PROGRESS">PROGRESS</option>
                <option value="PENDING">PENDING</option>
                <option value="SOLVED">SOLVED</option>
                <option value="CANCEL">CANCEL</option>
              </select>
            </div>
          </div>

          {/* BARIS 2: SUBJECT */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Subject WO <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              name="SUBJECT WO" 
              value={formData['SUBJECT WO']} 
              onChange={handleChange} 
              placeholder="Judul Pekerjaan"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium" 
            />
          </div>

          {/* BARIS 3: JENIS WO & NAMA TEAM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Jenis WO</label>
              <select 
                name="JENIS WO" 
                value={formData['JENIS WO']} 
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
              >
                <option value="PERMANEN">PERMANEN</option>
                <option value="SEMENTARA">SEMENTARA</option>
                <option value="BOD">BOD</option>
              </select>
            </div>
             
             <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nama Team</label>
              <select 
                name="NAMA TEAM" 
                value={formData['NAMA TEAM']} 
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
              >
                {teamList.length === 0 && <option value="">Loading teams...</option>}
                {teamList.map((team, index) => (
                  <option key={index} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>

          {/* BARIS 4: KETERANGAN */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Keterangan / Detail</label>
            <textarea 
              name="KETERANGAN" 
              rows="3" 
              value={formData['KETERANGAN']} 
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
              placeholder="Deskripsi pekerjaan..."
            ></textarea>
          </div>

           {/* BARIS 5: WAKTU SELESAI (DATE PICKER) */}
           <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Waktu Selesai (Jika Closed)</label>
              <input 
                type="date"  // <--- UBAH JADI DATE
                name="SELESAI ACTION" 
                value={formData['SELESAI ACTION']} 
                onChange={handleChange} 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
              />
            </div>

          {/* TOMBOL SIMPAN */}
          <div className="pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-lg disabled:bg-slate-300"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {saving ? 'Menyimpan...' : 'Simpan Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
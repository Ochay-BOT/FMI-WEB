'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
import { Save, ArrowLeft, Loader2, UserPlus } from 'lucide-react';

export default function CreateClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook untuk baca URL
  
  // Ambil nama dari URL (jika ada kiriman dari Tracker)
  const nameFromTracker = searchParams.get('name') || '';

  const [saving, setSaving] = useState(false);

  // Setup Supabase
  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

  // State Form
  const [formData, setFormData] = useState({
    'ID Pelanggan': '',
    'Nama Pelanggan': '', // Nanti diisi via useEffect biar aman dari error Hydration
    'ALAMAT': '',
    'VMAN / VLAN': '',
    'Near End': '',
    'Far End': '',
    'STATUS': 'Active', 
    'Kapasitas': '',
    'RX ONT/SFP': ''
  });

  // Effect: Isi nama otomatis jika ada data dari Tracker
  useEffect(() => {
    if (nameFromTracker) {
      setFormData(prev => ({ ...prev, 'Nama Pelanggan': nameFromTracker }));
    }
  }, [nameFromTracker]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Validasi Sederhana
    if (!formData['ID Pelanggan'] || !formData['Nama Pelanggan']) {
      alert('Wajib isi ID dan Nama Pelanggan!');
      setSaving(false);
      return;
    }

    // Eksekusi Simpan ke Supabase
    const { error } = await supabase
      .from('Data Client Corporate')
      .insert([formData]); 

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
      setSaving(false);
    } else {
      alert('Pelanggan berhasil ditambahkan!');
      router.push('/clients'); // Kembali ke tabel utama
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start font-sans">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8 border-b pb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="text-blue-600" /> Input Client Baru
            </h1>
            <p className="text-sm text-slate-500">Pastikan ID Pelanggan unik dan belum terdaftar.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* GROUP 1: IDENTITAS UTAMA */}
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Identitas Pelanggan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ID Pelanggan <span className="text-red-500">*</span></label>
                <input 
                  name="ID Pelanggan" 
                  value={formData['ID Pelanggan']} 
                  onChange={handleChange}
                  placeholder="Contoh: 10024"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Pelanggan <span className="text-red-500">*</span></label>
                <input 
                  name="Nama Pelanggan" 
                  value={formData['Nama Pelanggan']} 
                  onChange={handleChange}
                  placeholder="Nama PT / Perusahaan"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700" 
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">Alamat Instalasi</label>
              <textarea 
                name="ALAMAT" 
                rows="2"
                value={formData['ALAMAT']} 
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
              ></textarea>
            </div>
          </div>

          {/* GROUP 2: DATA TEKNIS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">VLAN / VMAN</label>
              <input 
                name="VMAN / VLAN" 
                value={formData['VMAN / VLAN']} 
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-blue-600" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kapasitas (Bandwidth)</label>
              <input 
                name="Kapasitas" 
                value={formData['Kapasitas']} 
                onChange={handleChange}
                placeholder="ex: 100 Mbps"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sinyal RX (dBm)</label>
              <input 
                name="RX ONT/SFP" 
                value={formData['RX ONT/SFP']} 
                onChange={handleChange}
                placeholder="-20.5"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700" 
              />
            </div>
          </div>

          {/* GROUP 3: PERANGKAT & STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Perangkat Near End (POP)</label>
              <input 
                name="Near End" 
                value={formData['Near End']} 
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Perangkat Far End (CPE)</label>
              <input 
                name="Far End" 
                value={formData['Far End']} 
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status Awal</label>
            <select 
              name="STATUS" 
              value={formData['STATUS']} 
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700"
            >
              <option value="Active">Active</option>
              <option value="Suspend">Suspend</option>
              <option value="Isolir">Isolir</option>
              <option value="Dismantle">Dismantle</option>
            </select>
          </div>

          {/* TOMBOL SAVE */}
          <div className="pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-lg hover:shadow-blue-500/30 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {saving ? 'Menyimpan Data...' : 'Simpan Client Baru'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
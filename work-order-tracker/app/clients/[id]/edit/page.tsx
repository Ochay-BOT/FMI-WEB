'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

export default function EditClientPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State awal kosong
  const [formData, setFormData] = useState({
    'ID Pelanggan': '',
    'Nama Pelanggan': '',
    'ALAMAT': '',
    'VMAN / VLAN': '',
    'Near End': '',
    'Far End': '',
    'STATUS': '',
    'Kapasitas': '',
    'RX ONT/SFP': ''
  });

  // 1. Ambil data lama saat halaman dibuka
  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('Data Client Corporate')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        alert('Error ambil data: ' + error.message);
        router.back();
      } else {
        // Isi form dengan data dari database
        setFormData(data); 
      }
      setLoading(false);
    }
    fetchData();
  }, [id, router]);

  // 2. Handle ketikan user
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Handle tombol Simpan (UPDATE)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('Data Client Corporate')
      .update({
        'ID Pelanggan': formData['ID Pelanggan'],
        'Nama Pelanggan': formData['Nama Pelanggan'],
        'ALAMAT': formData['ALAMAT'],
        'VMAN / VLAN': formData['VMAN / VLAN'],
        'Near End': formData['Near End'],
        'Far End': formData['Far End'],
        'STATUS': formData['STATUS'],
        'Kapasitas': formData['Kapasitas'],
        'RX ONT/SFP': formData['RX ONT/SFP']
      })
      .eq('id', id); // Update HANYA yang ID-nya cocok

    if (error) {
      alert('Gagal update: ' + error.message);
      setSaving(false);
    } else {
      alert('Data berhasil diperbarui!');
      router.push(`/clients/${id}`); // Balik ke halaman detail
      router.refresh();
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Mengambil data lama...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 border-b pb-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Edit Data Pelanggan</h1>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          
          {/* Form ID & Nama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label-text">ID Pelanggan</label>
              <input 
                name="ID Pelanggan" 
                value={formData['ID Pelanggan'] || ''} 
                onChange={handleChange}
                className="input-field text-slate-700" 
              />
            </div>
            <div>
              <label className="label-text">Nama Pelanggan</label>
              <input 
                name="Nama Pelanggan" 
                value={formData['Nama Pelanggan'] || ''} 
                onChange={handleChange}
                className="input-field text-slate-700" 
              />
            </div>
          </div>

          {/* Alamat */}
          <div>
            <label className="label-text">Alamat</label>
            <textarea 
              name="ALAMAT" 
              rows="3"
              value={formData['ALAMAT'] || ''} 
              onChange={handleChange}
              className="input-field text-slate-700" 
            ></textarea>
          </div>

          {/* Teknis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="label-text">VLAN</label>
              <input 
                name="VMAN / VLAN" 
                value={formData['VMAN / VLAN'] || ''} 
                onChange={handleChange}
                className="input-field text-slate-700" 
              />
            </div>
            <div>
              <label className="label-text">Kapasitas</label>
              <input 
                name="Kapasitas" 
                value={formData['Kapasitas'] || ''} 
                onChange={handleChange}
                className="input-field text-slate-700" 
              />
            </div>
             <div>
              <label className="label-text">RX (dBm)</label>
              <input 
                name="RX ONT/SFP" 
                value={formData['RX ONT/SFP'] || ''} 
                onChange={handleChange}
                className="input-field text-slate-700" 
              />
            </div>
          </div>

          {/* Perangkat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50 rounded">
            <div>
              <label className="label-text">Near End</label>
              <input 
                name="Near End" 
                value={formData['Near End'] || ''} 
                onChange={handleChange}
                className="input-field text-slate-700" 
              />
            </div>
            <div>
              <label className="label-text">Far End</label>
              <input 
                name="Far End" 
                value={formData['Far End'] || ''} 
                onChange={handleChange}
                className="input-field text-slate-700" 
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label-text">Status</label>
            <select 
              name="STATUS" 
              value={formData['STATUS'] || ''} 
              onChange={handleChange}
              className="input-field text-slate-700"
            >
              <option value="Active">Active</option>
              <option value="Suspend">Suspend</option>
              <option value="Isolir">Isolir</option>
              <option value="Dismantle">Dismantle</option>
            </select>
          </div>

          {/* Tombol Simpan */}
          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Menyimpan...' : 'Update Data'}
          </button>

        </form>
      </div>

      {/* Style CSS in JS (Biar rapi) */}
      <style jsx>{`
        .label-text { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 0.25rem; }
        .input-field { width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; outline: none; }
        .input-field:focus { border-color: #3b82f6; ring: 2px; ring-color: #3b82f6; }
      `}</style>
    </div>
  );
}
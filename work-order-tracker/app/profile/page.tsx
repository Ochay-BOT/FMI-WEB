'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User, Lock, Save, Loader2, Shield, Camera } from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  
  // Password State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        setEmail(user.email);

        // Ambil data detail dari tabel profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFullName(profile.full_name || '');
          setRole(profile.role || 'NOC Operator');
        }
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  // --- UPDATE PROFILE INFO ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);

    const updates = {
      id: user.id,
      full_name: fullName,
      role: role,
      updated_at: new Date(),
    };

    // Upsert: Update jika ada, Insert jika belum ada
    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      alert('Gagal update profile: ' + error.message);
    } else {
      alert('Profile berhasil diperbarui!');
    }
    setUpdating(false);
  };

  // --- UPDATE PASSWORD ---
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return alert('Password konfirmasi tidak cocok!');
    }
    if (password.length < 6) {
      return alert('Password minimal 6 karakter!');
    }

    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      alert('Gagal ganti password: ' + error.message);
    } else {
      alert('Password berhasil diganti! Silakan login ulang nanti.');
      setPassword('');
      setConfirmPassword('');
    }
    setUpdating(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat data pengguna...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
          {email.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengaturan Akun</h1>
          <p className="text-sm text-slate-500">Kelola informasi profil dan keamanan akun Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* KIRI: EDIT PROFILE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <User className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-800">Informasi Pribadi</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email (Read Only)</label>
              <input type="text" value={email} disabled className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Lengkap</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Jabatan / Role</label>
              <input 
                type="text" 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Contoh: NOC L1, Admin, SPV"
              />
            </div>

            <div className="pt-4">
              <button type="submit" disabled={updating} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold transition shadow-lg shadow-blue-500/20 disabled:bg-slate-300">
                {updating ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                Simpan Profil
              </button>
            </div>
          </form>
        </div>

        {/* KANAN: GANTI PASSWORD */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <Shield className="text-emerald-600" size={20} />
            <h2 className="font-bold text-slate-800">Keamanan & Password</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg text-xs text-amber-800 mb-4">
              <p>Password baru minimal harus 6 karakter. Pastikan menggunakan kombinasi yang aman.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Password Baru</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="******"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Konfirmasi Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="******"
                />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={updating || !password} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold transition shadow-lg shadow-emerald-500/20 disabled:bg-slate-300 disabled:cursor-not-allowed">
                {updating ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                Update Password
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
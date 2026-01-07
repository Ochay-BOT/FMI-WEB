'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr'; 
import { useRouter } from 'next/navigation';
import { Lock, Server, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',      // Tambah || ''
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''  // Tambah || ''
);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Login Gagal: ' + error.message);
      setLoading(false);
    } else {
      router.push('/'); 
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Biru */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner">
            <Server className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">NOC SYSTEM</h1>
          <p className="text-blue-100 text-xs uppercase tracking-wider mt-1 font-medium">Authorized Personnel Only</p>
        </div>

        {/* Form Input */}
        <div className="p-8 pt-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Staff</label>
              <input 
                type="email" 
                required
                // PERBAIKAN DI SINI: Tambah 'text-slate-900' agar tulisan berwarna gelap
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                placeholder="admin@isp.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  // PERBAIKAN DI SINI JUGA: Tambah 'text-slate-900'
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-10 text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-all flex justify-center items-center gap-2 shadow-lg disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'LOGIN SYSTEM'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            PT. ISP NETWORK INDONESIA &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
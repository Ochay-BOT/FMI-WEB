'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header'; 
import { 
  LayoutDashboard, Users, Activity, LineChart, Server, 
  History, Menu, LogOut, ClipboardList, Wrench, Megaphone,
  UserCircle, Settings // Icon baru
} from 'lucide-react';

// --- KOMPONEN SIDEBAR ITEM ---
function SidebarItem({ href, icon, label }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm mb-1 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}>
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}

export default function RootLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState({ name: 'NOC Operator', role: 'Online' });
  const router = useRouter();
  const pathname = usePathname(); 
  const isLoginPage = pathname === '/login';

  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

  // Fetch Nama Realtime dari Profile
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if(user) {
        const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
        if(profile) setUserProfile({ name: profile.full_name || user.email.split('@')[0], role: profile.role || 'NOC Operator' });
        else setUserProfile({ name: user.email.split('@')[0], role: 'NOC Operator' });
      }
    }
    if(!isLoginPage) loadUser();
  }, [pathname]); // Refresh saat pindah halaman

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); 
    router.refresh(); 
  };

  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className={`${isLoginPage ? 'bg-slate-900' : 'bg-slate-50'} min-h-screen font-sans ${isLoginPage ? '' : 'flex overflow-hidden'}`}>
        
        {isLoginPage ? (
          <main className="w-full h-full">{children}</main>
        ) : (
          <>
            {/* SIDEBAR */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-0 md:w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col flex-shrink-0 h-screen overflow-y-auto border-r border-slate-800 relative z-50`}>
              
              {/* Logo */}
              <div className="p-6 flex items-center gap-3 border-b border-slate-800 h-[73px]">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-900/50 flex-shrink-0">N</div>
                {sidebarOpen && (
                  <div className="animate-in fade-in duration-200">
                    <h1 className="font-bold text-lg tracking-wide whitespace-nowrap">NOC SYSTEM</h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">ISP Management v1.0</p>
                  </div>
                )}
              </div>

              {/* Menu */}
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                <p className="px-4 text-[10px] font-bold text-slate-600 uppercase mb-2 mt-2 tracking-widest truncate">Main Menu</p>
                <SidebarItem href="/" icon={<LayoutDashboard size={20} />} label="Overview" />
                <SidebarItem href="/clients" icon={<Users size={20} />} label="Data Client" />
                <SidebarItem href="/work-orders" icon={<ClipboardList size={20} />} label="Work Orders" />
                <SidebarItem href="/tracker" icon={<LineChart size={20} />} label="Tracker Pelanggan" />
                
                <p className="px-4 text-[10px] font-bold text-slate-600 uppercase mb-2 mt-6 tracking-widest truncate">Analytics & Master</p>
                <SidebarItem href="/vlan" icon={<Server size={20} />} label="VLAN Master" />
                <SidebarItem href="/logs" icon={<History size={20} />} label="Log Aktivitas" />
                
                <SidebarItem href="/tools" icon={<Wrench size={20} />} label="Tools & Utilities" />
                <SidebarItem href="/broadcast" icon={<Megaphone size={20} />} label="Broadcast Message" /> 
              </nav>

              {/* PROFILE SECTION (UPDATED) */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between gap-2">
                  
                  {/* Bagian Profile - Sekarang Clickable ke /profile */}
                  <Link href="/profile" className="flex items-center gap-3 overflow-hidden group flex-1 p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 border-slate-700 shadow-sm group-hover:border-blue-500 transition-colors">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                    {sidebarOpen && (
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">{userProfile.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <p className="text-[10px] text-slate-400 font-medium truncate group-hover:text-blue-300">{userProfile.role}</p>
                        </div>
                      </div>
                    )}
                  </Link>
                  
                  {/* Logout Button */}
                  {sidebarOpen && (
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors group"
                      title="Keluar / Sign Out"
                    >
                      <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
              <Header />
              <div className="md:hidden p-2 bg-white shadow-sm flex items-center gap-3 border-b border-slate-200">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
                <h1 className="font-bold text-slate-800 text-sm">Menu</h1>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {children}
              </div>
            </main>
          </>
        )}
      </body>
    </html>
  );
}

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="sticky top-0 z-50 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center gap-3 select-none">
              <img src="/logo.png" alt="AI Sync 101" className="h-16 w-auto" />
            </Link>

            <div className="flex items-center gap-4 sm:gap-6">
              <Link to="/history" className={`hidden sm:flex items-center text-sm font-bold transition-colors uppercase tracking-wider ${location.pathname === '/history' ? 'text-primary' : 'text-slate-600 dark:text-slate-300 hover:text-primary'}`}>
                <span className="material-symbols-outlined mr-1.5 text-xl">history</span> Records
              </Link>
              <Link to="/ai-calls" className={`hidden sm:flex items-center text-sm font-bold transition-colors uppercase tracking-wider ${location.pathname === '/ai-calls' ? 'text-primary' : 'text-slate-600 dark:text-slate-300 hover:text-primary'}`}>
                <span className="material-symbols-outlined mr-1.5 text-xl">psychology</span> AI Calls
              </Link>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">Site Manager</p>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Active Ops</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-brand-black flex items-center justify-center text-white font-black text-sm ring-2 ring-primary ring-offset-2">
                  SM
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="mt-auto py-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex flex-col items-center md:items-start">
              <img src="/logo.png" alt="AI Sync 101" className="h-20 w-auto" />
            </div>
            {/* <div className="flex gap-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <a href="#" className="hover:text-primary transition-colors">Security</a>
              <a href="#" className="hover:text-primary transition-colors">API Docs</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div> */}
            <div className="text-right">
              <p className="text-slate-400 text-[15px] font-black uppercase tracking-widest">&copy; 2026 LACompuTech LLC</p>
              <p className="text-slate-500 text-[12px] mt-1">High-Resolution Enterprise Edition</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Shield, Lock, UserCircle, Rocket } from 'lucide-react';

interface AuthOverlayProps {
  onLogin: (user: UserProfile) => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      // Create simulated user
      const user: UserProfile = {
          name: name,
          email: `${name.toLowerCase().replace(/\s/g, '')}@demo.com`,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`,
          sub: `user-${Date.now()}`,
          isGuest: false
      };
      onLogin(user);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center p-4">
       {/* Background Effects */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
       </div>

       <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-8 relative z-10 animate-fade-in">
           <div className="text-center mb-8">
               <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                   <Shield size={32} className="text-white" />
               </div>
               <h1 className="text-3xl font-bold text-white mb-2">AI-Trade Pro</h1>
               <p className="text-slate-400 text-sm">Paper Trading & Market Analysis</p>
           </div>

           <form onSubmit={handleLogin} className="space-y-4">
               <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Trader Name</label>
                   <div className="relative">
                       <UserCircle size={20} className="absolute left-3 top-3.5 text-slate-500" />
                       <input 
                          type="text" 
                          placeholder="Enter your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                          required
                          autoFocus
                       />
                   </div>
               </div>

               <button 
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 group shadow-lg shadow-blue-500/20 mt-4"
               >
                   <Rocket size={20} className="group-hover:-translate-y-1 transition-transform" />
                   Start Trading
               </button>
           </form>
           
           <div className="mt-8 text-center border-t border-slate-800 pt-6">
               <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                   <Lock size={10} /> Local Session. No Data Sent to Server.
               </p>
           </div>
       </div>
    </div>
  );
};